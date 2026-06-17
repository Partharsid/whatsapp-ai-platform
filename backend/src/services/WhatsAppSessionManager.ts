import { Boom } from '@hapi/boom'
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { usePrismaAuthState, purgeAuthState } from '../adapters/usePrismaAuthState'
import { WebSocketServer } from './websocket'
import { MessageHandler } from './MessageHandler'

export class WhatsAppSessionManager {
  private static instance: WhatsAppSessionManager
  private sessions: Map<string, WASocket> = new Map()
  private sessionMeta: Map<string, { tenantId: string; sessionName: string }> = new Map()
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private wsServer: WebSocketServer | null = null

  private constructor() {}

  static getInstance(): WhatsAppSessionManager {
    if (!WhatsAppSessionManager.instance) {
      WhatsAppSessionManager.instance = new WhatsAppSessionManager()
    }
    return WhatsAppSessionManager.instance
  }

  setWsServer(wsServer: WebSocketServer) {
    this.wsServer = wsServer
  }

  async initialize() {
    const connectedSessions = await prisma.baileysSession.findMany({
      where: { status: 'CONNECTED' },
      include: { tenant: true },
    })

    logger.info({ count: connectedSessions.length }, 'Rehydrating previous sessions')

    for (const session of connectedSessions) {
      try {
        await this.createSocket(session.id, session.tenantId, session.sessionName)
      } catch (error) {
        logger.error({ error, sessionId: session.id }, 'Failed to rehydrate session')
        await prisma.baileysSession.update({
          where: { id: session.id },
          data: { status: 'DISCONNECTED' },
        })
      }
    }
  }

  async createSession(tenantId: string, sessionName: string): Promise<{ sessionId: string }> {
    const session = await prisma.baileysSession.create({
      data: {
        tenantId,
        sessionName,
        status: 'SCAN_QR',
      },
    })

    this.createSocket(session.id, tenantId, sessionName)
      .catch((error) => {
        logger.error({ error, sessionId: session.id }, 'Failed to create socket')
      })

    return { sessionId: session.id }
  }

  async disconnectSession(sessionId: string): Promise<void> {
    const t = this.reconnectTimers.get(sessionId)
    if (t) { clearTimeout(t); this.reconnectTimers.delete(sessionId) }

    const sock = this.sessions.get(sessionId)
    if (sock) {
      sock.end(new Error('Manually disconnected'))
      sock.ws?.close()
      this.sessions.delete(sessionId)
    }

    this.sessionMeta.delete(sessionId)
    await purgeAuthState(sessionId)
    await prisma.baileysSession.update({
      where: { id: sessionId },
      data: { status: 'DISCONNECTED' },
    })
  }

  getSessionCount(): number {
    return this.sessions.size
  }

  getStatus(sessionId: string): string | null {
    const sock = this.sessions.get(sessionId)
    if (!sock) return null
    return sock.user ? 'CONNECTED' : 'CONNECTING'
  }

  private async createSocket(sessionId: string, tenantId: string, sessionName: string) {
    const { state, saveCreds, saveKeys } = await usePrismaAuthState(sessionId)
    const { version, isLatest } = await fetchLatestBaileysVersion()

    logger.info({ sessionId, sessionName, version }, 'Creating Baileys socket')

    this.sessionMeta.set(sessionId, { tenantId, sessionName })

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds as any,
        keys: makeCacheableSignalKeyStore(state.keys as any, logger as any),
      },
      printQRInTerminal: false,
      logger: logger as any,
      browser: ['WhatsApp AI Agent', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
    })

    this.sessions.set(sessionId, sock)

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds()
        logger.debug({ sessionId }, 'Creds saved after update')
      } catch (error) {
        logger.error({ error, sessionId }, 'Failed to save creds')
      }
    })

    sock.ev.on('connection.update', async (update: any) => {
      await this.handleConnectionUpdate(sock, sessionId, update)
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const messageHandler = MessageHandler.getInstance()
      for (const msg of messages) {
        await messageHandler.handleIncomingMessage(sessionId, tenantId, sock, msg)
      }
    })
  }

  private async handleConnectionUpdate(
    sock: WASocket,
    sessionId: string,
    update: any
  ) {
    const { connection, lastDisconnect, qr, isNewLogin } = update

    logger.info({ sessionId, update: JSON.stringify(update, (_, v) => typeof v === 'string' ? v.substring(0, 100) : v) }, 'Baileys connection update full')

    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#08090a', light: '#e4f222' },
        })
        this.wsServer?.sendQrCode(sessionId, qrBase64)
      } catch (error) {
        logger.error({ error, sessionId }, 'Failed to generate QR code')
      }

      await prisma.baileysSession.update({
        where: { id: sessionId },
        data: { status: 'SCAN_QR' },
      })
      this.wsServer?.sendStatus(sessionId, 'SCAN_QR')
    }

    if (isNewLogin) {
      logger.info({ sessionId }, 'New login detected after QR scan')
    }

    if (connection === 'open') {
      logger.info({ sessionId }, 'WhatsApp session connected')
      const t = this.reconnectTimers.get(sessionId)
      if (t) { clearTimeout(t); this.reconnectTimers.delete(sessionId) }
      this.sessions.set(sessionId, sock)
      await prisma.baileysSession.update({
        where: { id: sessionId },
        data: { status: 'CONNECTED' },
      })
      this.wsServer?.sendStatus(sessionId, 'CONNECTED')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const reason = lastDisconnect?.error?.message
      logger.info({ sessionId, statusCode, reason }, 'WhatsApp session disconnected')

      if (statusCode === DisconnectReason.loggedOut) {
        this.sessions.delete(sessionId)
        this.sessionMeta.delete(sessionId)
        await purgeAuthState(sessionId)
        await prisma.baileysSession.update({
          where: { id: sessionId },
          data: { status: 'DISCONNECTED' },
        })
        this.wsServer?.sendStatus(sessionId, 'LOGGED_OUT')
      } else {
        const meta = this.sessionMeta.get(sessionId)
        if (meta && !this.reconnectTimers.has(sessionId)) {
          logger.info({ sessionId, statusCode }, 'Scheduling reconnect in 3s')
          this.reconnectTimers.set(sessionId, setTimeout(() => {
            this.reconnectTimers.delete(sessionId)
            this.sessions.delete(sessionId)
            this.createSocket(sessionId, meta.tenantId, meta.sessionName).catch((error) => {
              logger.error({ error, sessionId }, 'Reconnect failed')
            })
          }, 3000))
        }
      }
    }
  }

  async shutdown() {
    logger.info('Shutting down WhatsApp session manager...')
    for (const [sessionId, timer] of this.reconnectTimers.entries()) {
      clearTimeout(timer)
    }
    this.reconnectTimers.clear()

    for (const [sessionId, sock] of this.sessions.entries()) {
      try {
        sock.end(new Error('Server shutting down'))
        sock.ws?.close()
      } catch (e) {
        logger.error({ sessionId, error: e }, 'Error closing socket during shutdown')
      }
    }
    this.sessions.clear()
    this.sessionMeta.clear()
  }
}

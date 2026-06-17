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
    const sock = this.sessions.get(sessionId)
    if (sock) {
      sock.end(new Error('Manually disconnected'))
      sock.ws?.close()
      this.sessions.delete(sessionId)
    }

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

    logger.info({ sessionId, sessionName, version, isLatest }, 'Creating Baileys socket')

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
    })

    this.sessions.set(sessionId, sock)

    sock.ev.on('creds.update', async () => {
      await saveCreds()
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
    const { connection, lastDisconnect, qr } = update

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

    if (connection === 'open') {
      logger.info({ sessionId }, 'WhatsApp session connected')
      await prisma.baileysSession.update({
        where: { id: sessionId },
        data: { status: 'CONNECTED' },
      })
      this.wsServer?.sendStatus(sessionId, 'CONNECTED')
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      logger.info({ sessionId, statusCode }, 'WhatsApp session disconnected')

      this.sessions.delete(sessionId)

      if (statusCode === DisconnectReason.loggedOut) {
        await purgeAuthState(sessionId)
        await prisma.baileysSession.update({
          where: { id: sessionId },
          data: { status: 'DISCONNECTED' },
        })
        this.wsServer?.sendStatus(sessionId, 'LOGGED_OUT')
      } else {
        await prisma.baileysSession.update({
          where: { id: sessionId },
          data: { status: 'DISCONNECTED' },
        })
        this.wsServer?.sendStatus(sessionId, 'DISCONNECTED')
      }
    }
  }
}

import { Server as HttpServer } from 'http'
import { WebSocketServer as WsServer, WebSocket } from 'ws'
import url from 'url'
import { logger } from '../config/logger'

interface QrClient {
  sessionId: string
  ws: WebSocket
}

export class WebSocketServer {
  private wss: WsServer | null = null
  private clients: Map<string, Set<WebSocket>> = new Map()

  constructor(private server: HttpServer) {}

  initialize() {
    this.wss = new WsServer({ server: this.server })

    this.wss.on('connection', (ws, req) => {
      const parsed = url.parse(req.url || '', true)
      const sessionId = parsed.query.sessionId as string

      if (!sessionId) {
        ws.close(4000, 'sessionId required')
        return
      }

      if (!this.clients.has(sessionId)) {
        this.clients.set(sessionId, new Set())
      }
      this.clients.get(sessionId)!.add(ws)

      logger.debug({ sessionId }, 'WebSocket client connected for session')

      ws.on('close', () => {
        const sessionClients = this.clients.get(sessionId)
        if (sessionClients) {
          sessionClients.delete(ws)
          if (sessionClients.size === 0) {
            this.clients.delete(sessionId)
          }
        }
        logger.debug({ sessionId }, 'WebSocket client disconnected')
      })

      ws.on('error', (error) => {
        logger.error({ error, sessionId }, 'WebSocket error')
      })

      ws.send(JSON.stringify({ type: 'connected', sessionId }))
    })

    logger.info('WebSocket server initialized')
  }

  sendQrCode(sessionId: string, qrBase64: string) {
    this.broadcast(sessionId, { type: 'qr', sessionId, qr: qrBase64 })
  }

  sendStatus(sessionId: string, status: string) {
    this.broadcast(sessionId, { type: 'status', sessionId, status })
  }

  private broadcast(sessionId: string, data: Record<string, unknown>) {
    const sessionClients = this.clients.get(sessionId)
    if (!sessionClients) return

    const message = JSON.stringify(data)
    for (const ws of sessionClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import path from 'path'
import next from 'next'
import { env, validateEnv } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import healthRoutes from './routes/health.routes'
import authRoutes from './routes/auth.routes'
import sessionRoutes from './routes/session.routes'
import tenantRoutes from './routes/tenant.routes'
import contactRoutes from './routes/contact.routes'
import messageRoutes from './routes/message.routes'
import { WhatsAppSessionManager } from './services/WhatsAppSessionManager'
import { WebSocketServer } from './services/websocket'
import { authMiddleware } from './middleware/auth'

validateEnv()

const app = express()
const server = http.createServer(app)

const nextApp = next({
  dev: env.NODE_ENV === 'development',
  dir: path.resolve(__dirname, '../../frontend'),
})
const handle = nextApp.getRequestHandler()

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/sessions', authMiddleware, sessionRoutes)
app.use('/api/tenants', authMiddleware, tenantRoutes)
app.use('/api/contacts', authMiddleware, contactRoutes)
app.use('/api/messages', authMiddleware, messageRoutes)

app.all('*', (req, res) => {
  return handle(req, res)
})

app.use(errorHandler)

let wsServerInstance: WebSocketServer | null = null

async function bootstrap() {
  try {
    await nextApp.prepare()
    logger.info('Next.js app prepared')

    await prisma.$connect()
    logger.info('Connected to PostgreSQL (Supabase)')

    wsServerInstance = new WebSocketServer(server)
    wsServerInstance.initialize()

    const sessionManager = WhatsAppSessionManager.getInstance()
    sessionManager.setWsServer(wsServerInstance)
    await sessionManager.initialize()
    logger.info('WhatsApp sessions rehydrated from database')

    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`)
    })
  } catch (error: any) {
    console.error('BOOTSTRAP ERROR:', error)
    console.error('STACK:', error?.stack)
    logger.error({ error: error?.message }, 'Failed to bootstrap server')
    process.exit(1)
  }
}

async function shutdown() {
  logger.info('Shutting down gracefully...')
  try {
    const sessionManager = WhatsAppSessionManager.getInstance()
    // You should add a shutdown method to WhatsAppSessionManager later
    if (typeof (sessionManager as any).shutdown === 'function') {
      await (sessionManager as any).shutdown()
    }
    
    // You should add a close method to WebSocketServer later
    if (wsServerInstance && typeof (wsServerInstance as any).close === 'function') {
      (wsServerInstance as any).close()
    }

    await prisma.$disconnect()
    server.close(() => {
      logger.info('HTTP server closed')
      process.exit(0)
    })
  } catch (err) {
    logger.error({ err }, 'Error during shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

bootstrap()

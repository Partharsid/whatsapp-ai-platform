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
app.use('/api/sessions', sessionRoutes)
app.use('/api/tenants', tenantRoutes)
app.use('/api/contacts', contactRoutes)
app.use('/api/messages', messageRoutes)

app.all('*', (req, res) => {
  return handle(req, res)
})

app.use(errorHandler)

async function bootstrap() {
  try {
    await nextApp.prepare()
    logger.info('Next.js app prepared')

    await prisma.$connect()
    logger.info('Connected to PostgreSQL (Supabase)')

    const wsServer = new WebSocketServer(server)
    wsServer.initialize()

    const sessionManager = WhatsAppSessionManager.getInstance()
    sessionManager.setWsServer(wsServer)
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

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

bootstrap()

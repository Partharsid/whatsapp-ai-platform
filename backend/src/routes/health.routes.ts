import { Router } from 'express'
import { prisma } from '../config/database'
import { WhatsAppSessionManager } from '../services/WhatsAppSessionManager'

const router = Router()

router.get('/health', async (_req, res) => {
  const sessionManager = WhatsAppSessionManager.getInstance()
  const sessionCount = sessionManager.getSessionCount()
  const sessions = await prisma.baileysSession.count()

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSockets: sessionCount,
    totalSessions: sessions,
    timestamp: new Date().toISOString(),
  })
})

export default router

import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { WhatsAppSessionManager } from '../services/WhatsAppSessionManager'
import { AppError } from '../middleware/errorHandler'
import { z } from 'zod'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const { tenantId, contactId, limit } = req.query

  const where: Record<string, unknown> = {}
  if (tenantId) where.tenantId = tenantId
  if (contactId) where.contactId = contactId

  const messages = await prisma.messageLog.findMany({
    where,
    include: {
      contact: { select: { id: true, phoneNumber: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit as string) || 50,
  })

  res.json({ messages })
})

const sendMessageSchema = z.object({
  tenantId: z.string().uuid(),
  contactId: z.string().uuid(),
  content: z.string().min(1),
})

router.post('/', async (req: Request, res: Response) => {
  const result = sendMessageSchema.safeParse(req.body)
  if (!result.success) throw new AppError(400, 'Invalid message payload')

  const { tenantId, contactId, content } = result.data

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  })
  if (!contact || contact.tenantId !== tenantId) throw new AppError(404, 'Contact not found')

  const sessions = await prisma.baileysSession.findMany({
    where: { tenantId, status: 'CONNECTED' },
  })
  if (sessions.length === 0) throw new AppError(400, 'No active WhatsApp session found for this tenant')

  const sessionManager = WhatsAppSessionManager.getInstance()
  const sock = sessionManager.getSession(sessions[0].id)
  if (!sock) throw new AppError(500, 'WhatsApp socket not available')

  const remoteJid = `${contact.phoneNumber}@s.whatsapp.net`
  await sock.sendMessage(remoteJid, { text: content })

  const messageLog = await prisma.messageLog.create({
    data: {
      tenantId,
      contactId,
      sender: 'BOT',
      content,
    },
  })

  // We will broadcast it to WS when we update MessageHandler or do it here.
  // Actually, we'll implement WebSocketServer broadcast next and inject it or do it here.

  res.status(201).json({ message: messageLog })
})

export default router

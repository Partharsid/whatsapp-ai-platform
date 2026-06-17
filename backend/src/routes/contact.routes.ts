import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { z } from 'zod'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const { tenantId, search } = req.query

  const where: Record<string, unknown> = {}
  if (tenantId) where.tenantId = tenantId
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { phoneNumber: { contains: search as string } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  res.json({ contacts })
})

router.get('/:id/messages', async (req: Request, res: Response) => {
  const contactId = req.params.id as string
  const messages = await prisma.messageLog.findMany({
    where: { contactId },
    orderBy: { timestamp: 'asc' },
    take: 50,
  })

  res.json({ messages })
})

const pauseSchema = z.object({
  aiPaused: z.boolean()
})

router.put('/:id/pause', async (req: Request, res: Response) => {
  const contactId = req.params.id as string
  const result = pauseSchema.safeParse(req.body)
  
  if (!result.success) {
    throw new AppError(400, 'Invalid payload: aiPaused must be boolean')
  }

  const contact = await prisma.contact.update({
    where: { id: contactId },
    data: { aiPaused: result.data.aiPaused }
  })

  res.json({ contact })
})

export default router

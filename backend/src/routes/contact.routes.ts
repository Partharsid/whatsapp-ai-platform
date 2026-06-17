import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'

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

export default router

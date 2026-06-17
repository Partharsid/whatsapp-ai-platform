import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'

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

export default router

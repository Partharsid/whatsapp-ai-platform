import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { WhatsAppSessionManager } from '../services/WhatsAppSessionManager'
import { AppError } from '../middleware/errorHandler'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const sessions = await prisma.baileysSession.findMany({
    include: {
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ sessions })
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const session = await prisma.baileysSession.findUnique({
    where: { id },
    include: { tenant: { select: { id: true, name: true } } },
  })
  if (!session) throw new AppError(404, 'Session not found')
  res.json({ session })
})

router.post('/', async (req: Request, res: Response) => {
  const { tenantId, sessionName } = req.body
  if (!tenantId || !sessionName) {
    throw new AppError(400, 'tenantId and sessionName are required')
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new AppError(404, 'Tenant not found')
  if (!tenant.active) throw new AppError(400, 'Tenant is not active')

  const sessionManager = WhatsAppSessionManager.getInstance()
  const { sessionId } = await sessionManager.createSession(tenantId, sessionName)

  res.status(201).json({ sessionId })
})

router.post('/:id/disconnect', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const session = await prisma.baileysSession.findUnique({
    where: { id },
  })
  if (!session) throw new AppError(404, 'Session not found')

  const sessionManager = WhatsAppSessionManager.getInstance()
  await sessionManager.disconnectSession(id)

  res.json({ message: 'Session disconnected' })
})

router.get('/tenant/:tenantId', async (req: Request, res: Response) => {
  const tenantId = req.params.tenantId as string
  const sessions = await prisma.baileysSession.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ sessions })
})

export default router

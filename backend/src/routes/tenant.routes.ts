import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { encrypt } from '../config/crypto'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { sessions: true, contacts: true, messages: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ tenants })
})

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { sessions: true, contacts: true, messages: true } },
      configs: true,
      sessions: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!tenant) throw new AppError(404, 'Tenant not found')
  res.json({ tenant })
})

router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body
  if (!name) throw new AppError(400, 'Tenant name is required')

  const tenant = await prisma.tenant.create({ data: { name } })

  await prisma.botConfig.create({
    data: {
      tenantId: tenant.id,
      openRouterKey: encrypt(''),
      aiModel: 'meta-llama/llama-3-8b-instruct:free',
      systemPrompt: 'You are a helpful WhatsApp AI assistant. Respond to customer queries professionally and concisely.',
    },
  })

  res.status(201).json({ tenant })
})

router.put('/:id', async (req: Request, res: Response) => {
  const { name, active } = req.body
  const id = req.params.id as string
  const tenant = await prisma.tenant.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(active !== undefined && { active }) },
  })
  res.json({ tenant })
})

router.get('/:id/config', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const config = await prisma.botConfig.findUnique({
    where: { tenantId: id },
  })
  if (!config) throw new AppError(404, 'Bot config not found')

  res.json({
    config: {
      id: config.id,
      tenantId: config.tenantId,
      aiModel: config.aiModel,
      systemPrompt: config.systemPrompt,
      hasApiKey: config.openRouterKey.length > 0,
    },
  })
})

router.put('/:id/config', async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { openRouterKey, aiModel, systemPrompt } = req.body

  const updateData: Record<string, unknown> = {}
  if (aiModel !== undefined) updateData.aiModel = aiModel
  if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt
  if (openRouterKey !== undefined) {
    updateData.openRouterKey = encrypt(openRouterKey)
  }

  const config = await prisma.botConfig.update({
    where: { tenantId: id },
    data: updateData,
  })

  res.json({
    config: {
      id: config.id,
      tenantId: config.tenantId,
      aiModel: config.aiModel,
      systemPrompt: config.systemPrompt,
      hasApiKey: config.openRouterKey.length > 0,
    },
  })
})

export default router

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../config/logger'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { z } from 'zod'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    throw new AppError(400, 'Invalid email or password format')
  }

  const { email, password } = result.data

  const user = await prisma.adminUser.findUnique({ where: { email } })
  if (!user) {
    throw new AppError(401, 'Invalid credentials')
  }

  const hash = crypto
    .pbkdf2Sync(password, user.passwordHash.split(':')[0], 100000, 64, 'sha512')
    .toString('hex')

  const storedHash = user.passwordHash.split(':')[1]
  if (hash !== storedHash) {
    throw new AppError(401, 'Invalid credentials')
  }

  logger.info({ userId: user.id }, 'Admin login successful')

  const token = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  })
})

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'Unauthorized')
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true }
  })

  if (!user) {
    throw new AppError(401, 'User not found')
  }

  res.json({ user })
})

export default router

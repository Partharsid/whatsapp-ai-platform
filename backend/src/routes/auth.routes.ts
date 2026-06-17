import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../config/database'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../config/logger'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new AppError(400, 'Email and password are required')
  }

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

  res.json({
    user: {
      id: user.id,
      email: user.email,
    },
  })
})

export default router

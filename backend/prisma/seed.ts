import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@whatsapp.ai'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user ${email} already exists`)
    return
  }

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash: hashPassword(password),
    },
  })

  console.log(`Admin user created: ${email} / ${password}`)
  console.log('⚠️  Change these credentials immediately in production!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

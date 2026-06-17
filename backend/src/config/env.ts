import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const env = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  MASTER_ENCRYPTION_KEY: process.env.MASTER_ENCRYPTION_KEY || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
} as const

function validateEnv() {
  const missing: string[] = []
  if (!env.DATABASE_URL) missing.push('DATABASE_URL')
  if (!env.MASTER_ENCRYPTION_KEY) missing.push('MASTER_ENCRYPTION_KEY')
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
}

export { validateEnv }

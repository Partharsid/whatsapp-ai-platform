import { Prisma } from '@prisma/client'
import { prisma } from '../config/database'
import { logger } from '../config/logger'

interface BaileysAuthState {
  creds: Record<string, unknown>
  keys: Record<string, unknown>
}

function serializeData(data: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
      return { __type: 'Buffer', data: value.data }
    }
    if (value instanceof Uint8Array || value instanceof Buffer) {
      return { __type: 'Buffer', data: Array.from(value) }
    }
    return value
  }))
}

function deserializeData(data: Prisma.JsonValue): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data), (_, value) => {
    if (value && typeof value === 'object' && value.__type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data)
    }
    return value
  })
}

async function readFromDb(sessionId: string, key: string): Promise<Record<string, unknown> | null> {
  try {
    const record = await prisma.baileysAuthState.findUnique({
      where: { sessionId_key: { sessionId, key } },
    })
    if (!record) return null
    return deserializeData(record.data)
  } catch (error) {
    logger.error({ error, sessionId, key }, 'Failed to read auth state from DB')
    return null
  }
}

async function writeToDb(sessionId: string, key: string, data: Record<string, unknown>): Promise<void> {
  try {
    const serialized = serializeData(data)
    await prisma.baileysAuthState.upsert({
      where: { sessionId_key: { sessionId, key } },
      update: { data: serialized },
      create: {
        sessionId,
        key,
        data: serialized,
      },
    })
  } catch (error) {
    logger.error({ error, sessionId, key }, 'Failed to write auth state to DB')
  }
}

export async function usePrismaAuthState(sessionId: string): Promise<{
  state: BaileysAuthState
  saveCreds: () => Promise<void>
  saveKeys: (keys: Record<string, unknown>) => Promise<void>
}> {
  const [credsData, keysData] = await Promise.all([
    readFromDb(sessionId, 'creds'),
    readFromDb(sessionId, 'app-keys'),
  ])

  const state: BaileysAuthState = {
    creds: credsData || {},
    keys: keysData || {},
  }

  const saveCreds = async () => {
    await writeToDb(sessionId, 'creds', state.creds)
  }

  const saveKeys = async (keys: Record<string, unknown>) => {
    state.keys = keys
    await writeToDb(sessionId, 'app-keys', keys)
  }

  return { state, saveCreds, saveKeys }
}

export async function purgeAuthState(sessionId: string): Promise<void> {
  try {
    await prisma.baileysAuthState.deleteMany({
      where: { sessionId },
    })
    logger.info({ sessionId }, 'Auth state purged from database')
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to purge auth state')
  }
}

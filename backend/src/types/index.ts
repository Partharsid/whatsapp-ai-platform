import { SessionStatus } from '@prisma/client'

export interface BaileysAuthCreds {
  [key: string]: unknown
}

export interface BaileysAuthKeys {
  [key: string]: unknown
}

export interface QrCallback {
  (qrBase64: string): void
}

export interface MessageEvent {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    extendedTextMessage?: { text: string }
    imageMessage?: { caption?: string }
  } | null
  pushName?: string
}

export interface ConnectionUpdate {
  connection?: string
  lastDisconnect?: {
    error?: { output?: { statusCode?: number } }
  }
  qr?: string
}

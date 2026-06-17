import { WASocket, proto } from '@whiskeysockets/baileys'
import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { decrypt } from '../config/crypto'
import { OpenRouterService } from './OpenRouterService'

export class MessageHandler {
  private static instance: MessageHandler
  private openRouter: OpenRouterService
  private processedMessages = new Set<string>()
  private contactLocks = new Map<string, Promise<void>>()

  private constructor() {
    this.openRouter = OpenRouterService.getInstance()
  }

  static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler()
    }
    return MessageHandler.instance
  }

  async handleIncomingMessage(
    sessionId: string,
    tenantId: string,
    sock: WASocket,
    msg: proto.IWebMessageInfo,
  ) {
    try {
      if (msg.key?.fromMe) return

      const remoteJid = msg.key?.remoteJid
      if (!remoteJid) return

      if (remoteJid.includes('@g.us')) return

      const msgId = msg.key.id
      if (msgId) {
        if (this.processedMessages.has(msgId)) return
        this.processedMessages.add(msgId)
        if (this.processedMessages.size > 10000) {
          const iterator = this.processedMessages.values()
          for (let i = 0; i < 1000; i++) {
            const val = iterator.next().value
            if (val !== undefined) this.processedMessages.delete(val)
          }
        }
      }

      const messageContent = this.extractText(msg)
      if (!messageContent) return

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '')
      const pushName = msg.pushName || null

      const contact = await this.upsertContact(tenantId, phoneNumber, pushName)

      const lockKey = `${tenantId}_${contact.id}`
      const previousPromise = this.contactLocks.get(lockKey) || Promise.resolve()

      const currentPromise = previousPromise.then(async () => {
        try {
          await this.processMessageTask(sessionId, tenantId, sock, remoteJid, contact.id, messageContent)
        } catch (error) {
          logger.error({ error, sessionId, tenantId }, 'Error in message processing task')
        }
      }).catch(err => logger.error({ err }, 'Error in promise chain'))

      this.contactLocks.set(lockKey, currentPromise)
    } catch (error) {
      logger.error({ error, sessionId, tenantId }, 'Error handling incoming message')
    }
  }

  private async processMessageTask(
    sessionId: string,
    tenantId: string,
    sock: WASocket,
    remoteJid: string,
    contactId: string,
    messageContent: string
  ) {
    const botConfig = await prisma.botConfig.findUnique({
      where: { tenantId },
    })

    if (!botConfig) {
      logger.warn({ tenantId }, 'No bot config found for tenant, sending default reply')
      await sock.sendMessage(remoteJid, {
        text: 'I am not configured yet. Please ask the admin to set up my AI configuration.',
      })
      return
    }

    const recentMessages = await prisma.messageLog.findMany({
      where: { tenantId, contactId: contactId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    })
    recentMessages.reverse()

    await prisma.messageLog.create({
      data: {
        tenantId,
        contactId,
        sender: 'USER',
        content: messageContent,
      },
    })

    await sock.sendPresenceUpdate('composing', remoteJid)

    const openRouterKey = decrypt(botConfig.openRouterKey)

    const reply = await this.openRouter.generateReply({
      apiKey: openRouterKey,
      model: botConfig.aiModel,
      systemPrompt: botConfig.systemPrompt,
      history: recentMessages,
      newMessage: messageContent,
    })

    await sock.sendPresenceUpdate('paused', remoteJid)

    if (reply) {
      await sock.sendMessage(remoteJid, { text: reply })

      await prisma.messageLog.create({
        data: {
          tenantId,
          contactId,
          sender: 'BOT',
          content: reply,
        },
      })
    }
  }

  private extractText(msg: proto.IWebMessageInfo): string | null {
    if (!msg.message) return null

    if (msg.message.conversation) return msg.message.conversation
    if (msg.message.extendedTextMessage?.text) return msg.message.extendedTextMessage.text
    if (msg.message.imageMessage?.caption) return msg.message.imageMessage.caption

    return null
  }

  private async upsertContact(tenantId: string, phoneNumber: string, name: string | null) {
    const existing = await prisma.contact.findUnique({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
    })

    if (existing) {
      if (name && existing.name !== name) {
        return prisma.contact.update({
          where: { id: existing.id },
          data: { name },
        })
      }
      return existing
    }

    return prisma.contact.create({
      data: { tenantId, phoneNumber, name },
    })
  }
}

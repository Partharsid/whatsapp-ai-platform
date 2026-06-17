import { WASocket, proto } from '@whiskeysockets/baileys'
import { prisma } from '../config/database'
import { logger } from '../config/logger'
import { decrypt } from '../config/crypto'
import { OpenRouterService } from './OpenRouterService'

export class MessageHandler {
  private static instance: MessageHandler
  private openRouter: OpenRouterService

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

      const messageContent = this.extractText(msg)
      if (!messageContent) return

      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '')
      const pushName = msg.pushName || null

      const contact = await this.upsertContact(tenantId, phoneNumber, pushName)

      await prisma.messageLog.create({
        data: {
          tenantId,
          contactId: contact.id,
          sender: 'USER',
          content: messageContent,
        },
      })

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
        where: { tenantId, contactId: contact.id },
        orderBy: { timestamp: 'desc' },
        take: 10,
      })

      recentMessages.reverse()

      const openRouterKey = decrypt(botConfig.openRouterKey)

      const reply = await this.openRouter.generateReply({
        apiKey: openRouterKey,
        model: botConfig.aiModel,
        systemPrompt: botConfig.systemPrompt,
        history: recentMessages,
        newMessage: messageContent,
      })

      if (reply) {
        await sock.sendMessage(remoteJid, { text: reply })

        await prisma.messageLog.create({
          data: {
            tenantId,
            contactId: contact.id,
            sender: 'BOT',
            content: reply,
          },
        })
      }
    } catch (error) {
      logger.error({ error, sessionId, tenantId }, 'Error handling incoming message')
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

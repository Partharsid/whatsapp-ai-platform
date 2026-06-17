import axios from 'axios'
import { logger } from '../config/logger'

interface HistoryMessage {
  sender: string
  content: string
}

interface GenerateReplyParams {
  apiKey: string
  model: string
  systemPrompt: string
  history: HistoryMessage[]
  newMessage: string
}

export class OpenRouterService {
  private static instance: OpenRouterService
  private baseUrl = 'https://openrouter.ai/api/v1'

  private constructor() {}

  static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService()
    }
    return OpenRouterService.instance
  }

  async generateReply(params: GenerateReplyParams): Promise<string | null> {
    const { apiKey, model, systemPrompt, history, newMessage } = params

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    for (const msg of history) {
      messages.push({
        role: msg.sender === 'BOT' ? 'assistant' : 'user',
        content: msg.content,
      })
    }

    messages.push({ role: 'user', content: newMessage })

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: model || 'meta-llama/llama-3-8b-instruct:free',
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://whatsapp-ai-platform.com',
            'X-Title': 'WhatsApp AI Agent',
          },
          timeout: 30000,
        },
      )

      const reply = response.data?.choices?.[0]?.message?.content
      if (!reply) {
        logger.warn({ model }, 'OpenRouter returned no content')
        return null
      }

      return reply.trim()
    } catch (error: any) {
      logger.error(
        {
          error: error.message,
          status: error.response?.status,
          model,
        },
        'OpenRouter API call failed',
      )
      return 'I apologize, but I am having trouble processing your request right now. Please try again later.'
    }
  }
}

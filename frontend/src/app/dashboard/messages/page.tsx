'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Mail, Bot, User } from 'lucide-react'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMessages() {
      try {
        const data = await api.messages.list({ limit: 100 })
        setMessages(data.messages)
      } catch (error) {
        console.error('Failed to load messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Message Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent messages across all tenants</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-3 w-48 bg-white/10 rounded mb-2" />
              <div className="h-3 w-64 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No messages yet. Messages will appear here once your bots start chatting.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: any) => (
            <div key={msg.id} className="glass rounded-xl p-4 flex items-start gap-3 glass-hover">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'BOT' ? 'bg-emerald/10' : 'bg-accent/10'
              }`}>
                {msg.sender === 'BOT' ? (
                  <Bot className="w-4 h-4 text-emerald" />
                ) : (
                  <User className="w-4 h-4 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap">
                  <span className={msg.sender === 'BOT' ? 'text-emerald font-medium' : 'text-accent font-medium'}>
                    {msg.sender}
                  </span>
                  <span>·</span>
                  <span>{msg.contact?.name || msg.contact?.phoneNumber || 'Unknown'}</span>
                  <span>·</span>
                  <span>{msg.tenant?.name}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm text-foreground">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

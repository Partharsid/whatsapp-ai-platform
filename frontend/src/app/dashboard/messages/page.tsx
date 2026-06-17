'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { GlassCard } from '@/components/ui/glass-card'
import { Mail, Bot, User } from 'lucide-react'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { const d = await api.messages.list({ limit: 100 }); setMessages(d.messages) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Message Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent messages across all tenants</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="h-3 w-48 bg-white/10 rounded mb-2" />
              <div className="h-3 w-64 bg-white/5 rounded" />
            </GlassCard>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Mail className="h-6 w-6 text-primary" /></div>
          </div>
          <p className="text-sm text-muted-foreground">No messages yet. Messages will appear here once your bots start chatting.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {messages.map((msg: any) => (
            <GlassCard key={msg.id} className="p-4 flex items-start gap-3 hover:bg-white/[0.06] transition-all">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${msg.sender === 'BOT' ? 'bg-emerald/10' : 'bg-accent/10'}`}>
                {msg.sender === 'BOT' ? <Bot className="h-4 w-4 text-emerald" /> : <User className="h-4 w-4 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap">
                  <span className={msg.sender === 'BOT' ? 'text-emerald font-medium' : 'text-accent font-medium'}>{msg.sender}</span>
                  <span>·</span>
                  <span>{msg.contact?.name || msg.contact?.phoneNumber || 'Unknown'}</span>
                  <span>·</span>
                  <span>{msg.tenant?.name}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm text-foreground">{msg.content}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

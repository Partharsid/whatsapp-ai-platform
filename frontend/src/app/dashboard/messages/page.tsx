'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

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
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-light text-snow tracking-tight">Message Log</h1>
        <p className="text-sm text-fog mt-1">Recent messages across all tenants</p>
      </div>

      {loading ? (
        <div className="text-sm text-fog">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-fog">No messages yet. Messages will appear here once your bots start chatting.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((msg: any) => (
            <div key={msg.id} className="card-surface p-3 flex items-start gap-3">
              <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${
                msg.sender === 'BOT' ? 'bg-emerald' : 'bg-indigo'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-fog mb-1">
                  <span className={msg.sender === 'BOT' ? 'text-emerald' : 'text-indigo'}>
                    {msg.sender}
                  </span>
                  <span>·</span>
                  <span>{msg.contact?.name || msg.contact?.phoneNumber || 'Unknown'}</span>
                  <span>·</span>
                  <span>{msg.tenant?.name}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm text-snow truncate">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

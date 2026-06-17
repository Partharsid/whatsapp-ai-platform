'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { GlassCard } from '@/components/ui/glass-card'
import { Search, MessageCircle, User, Send, PauseCircle, PlayCircle } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'

interface Contact {
  id: string
  phoneNumber: string
  name: string | null
  tenantId: string
  tenant: { name: string }
  _count: { messages: number }
  aiPaused: boolean
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sessionsMap, setSessionsMap] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSessionId = selected ? sessionsMap[selected.tenantId] : null
  const { latestMessage } = useWebSocket(activeSessionId)

  useEffect(() => {
    if (latestMessage && selected && latestMessage.contactId === selected.id) {
      setMessages(prev => {
        if (prev.find(m => m.id === latestMessage.id)) return prev
        return [...prev, latestMessage]
      })
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [latestMessage, selected])

  useEffect(() => {
    async function init() {
      const s = await api.sessions.list()
      const map: Record<string, string> = {}
      s.sessions.forEach((x: any) => map[x.tenantId] = x.id)
      setSessionsMap(map)
    }
    init()
  }, [])

  async function loadContacts() {
    try { const d = await api.contacts.list({ search }); setContacts(d.contacts) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadContacts() }, [search])

  async function loadMessages(contact: Contact) {
    try { 
      const d = await api.contacts.messages(contact.id); 
      setMessages(d.messages); 
      setSelected(contact)
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100)
    }
    catch (e) { console.error(e) }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageInput.trim() || !selected) return
    const content = messageInput
    setMessageInput('')
    try {
      await api.messages.send(selected.tenantId, selected.id, content)
      // The websocket will echo the message back, but we can also just wait for it.
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleAiPause() {
    if (!selected) return
    try {
      const newPaused = !selected.aiPaused
      await api.contacts.togglePause(selected.id, newPaused)
      setSelected({ ...selected, aiPaused: newPaused })
      setContacts(contacts.map(c => c.id === selected.id ? { ...c, aiPaused: newPaused } : c))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex gap-4 lg:gap-6 h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      <div className="w-72 lg:w-80 flex-shrink-0 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-3">Contacts</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" placeholder="Search..." />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="p-3 animate-pulse"><div className="h-4 w-32 bg-white/10 rounded" /></GlassCard>
            ))
          ) : contacts.length === 0 ? (
            <div className="text-sm text-muted-foreground p-6 text-center">No contacts found</div>
          ) : (
            contacts.map((contact) => (
              <button key={contact.id} onClick={() => loadMessages(contact)}
                className={`w-full text-left backdrop-blur-xl rounded-xl p-3 border transition-all ${
                  selected?.id === contact.id ? 'bg-white/[0.08] border-white/[0.12]' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 flex-shrink-0"><User className="h-4 w-4 text-accent" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate font-medium">{contact.name || contact.phoneNumber}</div>
                    <div className="text-xs text-muted-foreground truncate">{contact.tenant.name} · {contact._count.messages} messages</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <GlassCard className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="border-b border-white/[0.1] p-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selected.name || selected.phoneNumber}</h2>
                <div className="text-xs text-muted-foreground">{selected.tenant.name}</div>
              </div>
              <button onClick={toggleAiPause} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selected.aiPaused ? 'bg-accent/20 text-accent hover:bg-accent/30' : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
              }`}>
                {selected.aiPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                {selected.aiPaused ? 'AI Paused (Resume)' : 'Pause AI'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && <div className="text-sm text-muted-foreground text-center pt-8">No messages yet</div>}
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender === 'BOT' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-4 py-2.5 rounded-xl text-sm ${
                    msg.sender === 'BOT'
                      ? 'bg-accent/15 text-foreground'
                      : 'backdrop-blur-xl bg-white/[0.05] border border-white/[0.08]'
                  }`}>
                    <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1.5">
                      <MessageCircle className="h-3 w-3" />
                      {msg.sender === 'BOT' ? 'AI / You' : 'User'} · {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/[0.1] bg-black/20">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10 rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <button type="submit" disabled={!messageInput.trim()} className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  <Send className="h-4 w-4" /> Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a contact to view messages</p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

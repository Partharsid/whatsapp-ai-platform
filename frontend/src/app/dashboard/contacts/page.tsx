'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Contact {
  id: string
  phoneNumber: string
  name: string | null
  createdAt: string
  tenant: { name: string }
  _count: { messages: number }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])

  async function loadContacts() {
    try {
      const data = await api.contacts.list({ search })
      setContacts(data.contacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContacts() }, [search])

  async function loadMessages(contactId: string) {
    try {
      const data = await api.contacts.messages(contactId)
      setMessages(data.messages)
      setSelected(contactId)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-6rem)]">
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="text-xl font-light text-snow tracking-tight">Contacts</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none mt-2"
            placeholder="Search by name or phone..."
          />
        </div>

        {loading ? (
          <div className="text-sm text-fog">Loading contacts...</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => loadMessages(contact.id)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selected === contact.id ? 'bg-obsidian' : 'hover:bg-obsidian/50'
                }`}
              >
                <div className="text-sm text-snow truncate">
                  {contact.name || contact.phoneNumber}
                </div>
                <div className="text-xs text-fog truncate">
                  {contact.tenant.name} · {contact._count.messages} messages
                </div>
              </button>
            ))}
            {contacts.length === 0 && (
              <div className="text-sm text-fog p-4 text-center">No contacts found</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 card-surface flex flex-col">
        {selected ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'BOT' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-md px-3 py-2 rounded-md text-sm ${
                    msg.sender === 'BOT'
                      ? 'bg-steel text-snow'
                      : 'bg-indigo/20 text-snow'
                  }`}
                >
                  <div className="text-[10px] text-fog mb-1">
                    {msg.sender === 'BOT' ? 'AI Bot' : 'User'} · {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-fog">Select a contact to view messages</p>
          </div>
        )}
      </div>
    </div>
  )
}

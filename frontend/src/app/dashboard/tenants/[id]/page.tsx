'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'

interface Session {
  id: string
  sessionName: string
  status: string
  createdAt: string
}

interface Tenant {
  id: string
  name: string
  active: boolean
  sessions: Session[]
  _count: { contacts: number; messages: number }
}

interface BotConfig {
  id: string
  tenantId: string
  aiModel: string
  systemPrompt: string
  hasApiKey: boolean
}

const MODELS = [
  { value: 'meta-llama/llama-3-8b-instruct:free', label: 'Llama 3 8B (Free)' },
  { value: 'meta-llama/llama-3-70b-instruct', label: 'Llama 3 70B' },
  { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
  { value: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (Free)' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
]

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [activeTab, setActiveTab] = useState<'sessions' | 'config'>('sessions')
  const [sessionName, setSessionName] = useState('')
  const [newSessionId, setNewSessionId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [aiModel, setAiModel] = useState('meta-llama/llama-3-8b-instruct:free')
  const [systemPrompt, setSystemPrompt] = useState('')

  const { qrCode, status: wsStatus } = useWebSocket(newSessionId)

  async function loadTenant() {
    try {
      const data = await api.tenants.get(tenantId)
      setTenant(data.tenant)
    } catch (error) {
      console.error('Failed to load tenant:', error)
    }
  }

  async function loadConfig() {
    try {
      const data = await api.tenants.getConfig(tenantId)
      setConfig(data.config)
      setAiModel(data.config.aiModel)
      setSystemPrompt(data.config.systemPrompt)
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  useEffect(() => {
    if (tenantId) {
      loadTenant()
      loadConfig()
    }
  }, [tenantId])

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionName.trim()) return

    try {
      const data = await api.sessions.create(tenantId, sessionName.trim())
      setNewSessionId(data.sessionId)
      setSessionName('')
      await loadTenant()
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  async function handleDisconnect(sessionId: string) {
    await api.sessions.disconnect(sessionId)
    setNewSessionId(null)
    await loadTenant()
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.tenants.updateConfig(tenantId, {
        openRouterKey: apiKey || undefined,
        aiModel,
        systemPrompt,
      })
      await loadConfig()
      setApiKey('')
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  if (!tenant) {
    return <div className="text-sm text-fog">Loading tenant...</div>
  }

  const statusColors: Record<string, string> = {
    CONNECTED: 'text-emerald bg-emerald/10',
    SCAN_QR: 'text-cyan bg-cyan/10',
    DISCONNECTED: 'text-fog bg-iron',
  }

  return (
    <div>
      <button
        onClick={() => router.push('/dashboard/tenants')}
        className="text-xs text-fog hover:text-snow mb-4 transition-colors"
      >
        ← Back to Tenants
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-light text-snow tracking-tight">{tenant.name}</h1>
          <p className="text-xs text-fog mt-1">
            {tenant._count.contacts} contacts · {tenant._count.messages} messages
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          tenant.active ? 'bg-emerald/10 text-emerald' : 'bg-iron text-fog'
        }`}>
          {tenant.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="flex gap-1 mb-6 border-b border-graphite pb-1">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            activeTab === 'sessions' ? 'bg-obsidian text-snow' : 'text-fog hover:text-snow'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            activeTab === 'config' ? 'bg-obsidian text-snow' : 'text-fog hover:text-snow'
          }`}
        >
          AI Configuration
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div>
          <form onSubmit={handleCreateSession} className="flex gap-2 mb-4">
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex-1 input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none"
              placeholder="Session name (e.g., Main Bot)"
            />
            <button type="submit" className="btn-primary text-xs">
              + New Session
            </button>
          </form>

          {newSessionId && (
            <div className="card-surface p-6 mb-4 text-center">
              <div className="mb-3">
                <div className="text-xs text-fog mb-2">Scan this QR code with WhatsApp</div>
                {qrCode ? (
                  <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center">
                    <div className="text-xs text-fog">
                      {wsStatus === 'CONNECTED' ? 'Connected!' : 'Waiting for QR code...'}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-fog">
                Status: <span className="text-emerald">{wsStatus || 'SCAN_QR'}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {tenant.sessions.length === 0 ? (
              <div className="text-sm text-fog">No sessions yet. Create one above.</div>
            ) : (
              tenant.sessions.map((session) => (
                <div key={session.id} className="card-surface p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-snow">{session.sessionName}</div>
                    <div className="text-xs text-fog mt-0.5">
                      Created {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[session.status] || 'text-fog bg-iron'}`}>
                      {session.status}
                    </span>
                    {session.status !== 'DISCONNECTED' && (
                      <button
                        onClick={() => handleDisconnect(session.id)}
                        className="text-xs text-crimson hover:text-crimson/80"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="card-surface p-5 space-y-4">
          <div>
            <label className="block text-xs text-fog mb-1">OpenRouter API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none"
              placeholder={config?.hasApiKey ? '•••••••• (key saved)' : 'sk-or-v1-...'}
            />
            <p className="text-[10px] text-fog mt-1">Leave blank to keep existing key</p>
          </div>

          <div>
            <label className="block text-xs text-fog mb-1">AI Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value} className="bg-obsidian">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-fog mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none resize-vertical"
              placeholder="You are a helpful WhatsApp AI assistant..."
            />
          </div>

          <button type="submit" className="btn-primary text-xs">
            Save Configuration
          </button>
        </form>
      )}
    </div>
  )
}

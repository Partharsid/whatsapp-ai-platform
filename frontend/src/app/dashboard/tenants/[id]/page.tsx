'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ArrowLeft, Plus, Smartphone, Bot, QrCode } from 'lucide-react'
import { toast } from 'sonner'

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
      toast.success('Session created')
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error('Failed to create session')
    }
  }

  async function handleDisconnect(sessionId: string) {
    try {
      await api.sessions.disconnect(sessionId)
      setNewSessionId(null)
      await loadTenant()
      toast.success('Session disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
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
      toast.success('Configuration saved')
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('Failed to save configuration')
    }
  }

  if (!tenant) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-xl p-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    CONNECTED: 'bg-emerald/10 text-emerald',
    SCAN_QR: 'bg-cyan/10 text-cyan',
    DISCONNECTED: 'bg-white/[0.05] text-muted-foreground',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard/tenants')}
        className="glass-button-ghost inline-flex items-center gap-1.5 text-xs mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Tenants
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{tenant.name[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {tenant._count.contacts} contacts · {tenant._count.messages} messages
            </p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${
          tenant.active ? 'bg-emerald/10 text-emerald' : 'bg-white/[0.05] text-muted-foreground'
        }`}>
          {tenant.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-1">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`glass-tab ${activeTab === 'sessions' ? 'glass-tab-active' : ''}`}
        >
          <Smartphone className="w-3.5 h-3.5 inline mr-1.5" />
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`glass-tab ${activeTab === 'config' ? 'glass-tab-active' : ''}`}
        >
          <Bot className="w-3.5 h-3.5 inline mr-1.5" />
          AI Configuration
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div>
          <form onSubmit={handleCreateSession} className="flex gap-2 mb-6">
            <input
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex-1 glass-input"
              placeholder="Session name (e.g., Main Bot)"
            />
            <button type="submit" className="glass-button text-xs gap-1.5 inline-flex items-center">
              <Plus className="w-3.5 h-3.5" /> New Session
            </button>
          </form>

          {newSessionId && (
            <div className="glass rounded-xl p-6 mb-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-6 h-6 text-cyan" />
                </div>
                <div className="text-xs text-muted-foreground mb-3">Scan this QR code with WhatsApp</div>
                {qrCode ? (
                  <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto w-48 h-48 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center glass rounded-lg">
                    <div className="text-xs text-muted-foreground">
                      {wsStatus === 'CONNECTED' ? 'Connected!' : 'Waiting for QR code...'}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Status: <span className="text-emerald font-medium">{wsStatus || 'SCAN_QR'}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {tenant.sessions.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No sessions yet. Create one above.</p>
              </div>
            ) : (
              tenant.sessions.map((session) => (
                <div key={session.id} className="glass rounded-xl p-4 flex items-center justify-between glass-hover">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'CONNECTED' ? 'bg-emerald' : session.status === 'SCAN_QR' ? 'bg-cyan' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <div className="text-sm text-foreground font-medium">{session.sessionName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Created {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[session.status] || 'bg-white/[0.05] text-muted-foreground'}`}>
                      {session.status}
                    </span>
                    {session.status !== 'DISCONNECTED' && (
                      <button
                        onClick={() => handleDisconnect(session.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
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
        <form onSubmit={handleSaveConfig} className="glass rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">OpenRouter API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full glass-input"
              placeholder={config?.hasApiKey ? '•••••••• (key saved)' : 'sk-or-v1-...'}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Leave blank to keep existing key</p>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">AI Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full glass-input"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value} className="bg-background">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full glass-input resize-vertical"
              placeholder="You are a helpful WhatsApp AI assistant..."
            />
          </div>

          <button type="submit" className="glass-button text-xs">
            Save Configuration
          </button>
        </form>
      )}
    </div>
  )
}

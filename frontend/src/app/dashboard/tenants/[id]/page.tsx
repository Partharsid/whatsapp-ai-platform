'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'
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
    try { const d = await api.tenants.get(tenantId); setTenant(d.tenant) }
    catch (e) { console.error('Failed to load tenant:', e) }
  }

  async function loadConfig() {
    try {
      const d = await api.tenants.getConfig(tenantId)
      setConfig(d.config)
      setAiModel(d.config.aiModel)
      setSystemPrompt(d.config.systemPrompt)
    } catch (e) { console.error('Failed to load config:', e) }
  }

  useEffect(() => { if (tenantId) { loadTenant(); loadConfig() } }, [tenantId])

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionName.trim()) return
    try {
      const d = await api.sessions.create(tenantId, sessionName.trim())
      setNewSessionId(d.sessionId)
      setSessionName('')
      await loadTenant()
      toast.success('Session created')
    } catch { toast.error('Failed to create session') }
  }

  async function handleDisconnect(sessionId: string) {
    try {
      await api.sessions.disconnect(sessionId)
      setNewSessionId(null)
      await loadTenant()
      toast.success('Session disconnected')
    } catch { toast.error('Failed to disconnect') }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.tenants.updateConfig(tenantId, { openRouterKey: apiKey || undefined, aiModel, systemPrompt })
      await loadConfig()
      setApiKey('')
      toast.success('Configuration saved')
    } catch { toast.error('Failed to save config') }
  }

  if (!tenant) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-8 text-center animate-pulse">
          <div className="flex justify-center"><div className="h-8 w-8 rounded-lg bg-white/10" /></div>
          <div className="h-4 w-32 mx-auto mt-3 bg-white/10 rounded" />
        </GlassCard>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    CONNECTED: 'bg-emerald/10 text-emerald',
    SCAN_QR: 'bg-cyan/10 text-cyan',
    DISCONNECTED: 'bg-white/[0.05] text-muted-foreground',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => router.push('/dashboard/tenants')} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tenants
      </button>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-lg font-bold text-primary">{tenant.name[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">{tenant._count.contacts} contacts · {tenant._count.messages} messages</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${tenant.active ? 'bg-emerald/10 text-emerald' : 'bg-white/[0.05] text-muted-foreground'}`}>
          {tenant.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-1">
        <button onClick={() => setActiveTab('sessions')} className={`px-3 py-1.5 text-xs rounded-lg transition-all ${activeTab === 'sessions' ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Smartphone className="h-3.5 w-3.5 inline mr-1.5" />Sessions
        </button>
        <button onClick={() => setActiveTab('config')} className={`px-3 py-1.5 text-xs rounded-lg transition-all ${activeTab === 'config' ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Bot className="h-3.5 w-3.5 inline mr-1.5" />AI Configuration
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="space-y-4">
          <form onSubmit={handleCreateSession} className="flex gap-2">
            <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="flex-1 h-10 rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" placeholder="Session name (e.g., Main Bot)" />
            <button type="submit" className="inline-flex items-center gap-1.5 h-10 rounded-lg bg-primary text-primary-foreground px-4 text-xs font-medium hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> New Session
            </button>
          </form>

          {newSessionId && (
            <GlassCard className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/10"><QrCode className="h-6 w-6 text-cyan" /></div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Scan this QR code with WhatsApp</p>
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR" className="mx-auto w-48 h-48 rounded-lg" />
              ) : (
                <div className="mx-auto w-48 h-48 flex items-center justify-center backdrop-blur-xl bg-white/[0.03] rounded-lg">
                  <span className="text-xs text-muted-foreground">{wsStatus === 'CONNECTED' ? 'Connected!' : 'Waiting for QR...'}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Status: <span className="text-emerald font-medium">{wsStatus || 'SCAN_QR'}</span></p>
            </GlassCard>
          )}

          {tenant.sessions.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Smartphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sessions yet. Create one above.</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {tenant.sessions.map((s) => (
                <GlassCard key={s.id} className="p-4 flex items-center justify-between hover:bg-white/[0.06] transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${s.status === 'CONNECTED' ? 'bg-emerald' : s.status === 'SCAN_QR' ? 'bg-cyan' : 'bg-muted-foreground'}`} />
                    <div>
                      <div className="text-sm text-foreground font-medium">{s.sessionName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s.status] || 'bg-white/[0.05] text-muted-foreground'}`}>{s.status}</span>
                    {s.status !== 'DISCONNECTED' && (
                      <button onClick={() => handleDisconnect(s.id)} className="text-xs text-destructive hover:text-destructive/80">Disconnect</button>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveConfig} className="space-y-5">
          <GlassCard className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">OpenRouter API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" placeholder={config?.hasApiKey ? '•••••••• (key saved)' : 'sk-or-v1-...'} />
              <p className="text-[10px] text-muted-foreground">Leave blank to keep existing key</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">AI Model</label>
              <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-sm text-foreground focus:outline-none focus:border-primary/50">
                {MODELS.map((m) => (<option key={m.value} value={m.value} className="bg-background">{m.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">System Prompt</label>
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="flex w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-vertical" placeholder="You are a helpful WhatsApp AI assistant..." />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-primary text-primary-foreground px-4 text-xs font-medium hover:brightness-110 transition-all">Save Configuration</button>
          </GlassCard>
        </form>
      )}
    </div>
  )
}

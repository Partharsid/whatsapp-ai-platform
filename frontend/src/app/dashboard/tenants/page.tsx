'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card'
import { Plus, ExternalLink, Power, PowerOff } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Tenant {
  id: string
  name: string
  active: boolean
  createdAt: string
  _count: { sessions: number; contacts: number; messages: number }
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  async function loadTenants() {
    try {
      const data = await api.tenants.list()
      setTenants(data.tenants)
    } catch (error) {
      console.error('Failed to load tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTenants() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await api.tenants.create(newName.trim())
      setNewName('')
      setShowCreate(false)
      await loadTenants()
      toast.success('Tenant created')
    } catch {
      toast.error('Failed to create tenant')
    }
  }

  async function toggleActive(tenant: Tenant) {
    try {
      await api.tenants.update(tenant.id, { active: !tenant.active })
      await loadTenants()
      toast.success(tenant.active ? 'Tenant deactivated' : 'Tenant activated')
    } catch {
      toast.error('Failed to update tenant')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your WhatsApp AI tenants</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:brightness-110 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="backdrop-blur-xl bg-background/95 border border-white/[0.08] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Tenant</DialogTitle>
              <DialogDescription className="text-muted-foreground">Add a new tenant to manage WhatsApp sessions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="py-4">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  placeholder="e.g., Eggeez Support"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowCreate(false)} variant="ghost" className="text-muted-foreground">Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:brightness-110">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="p-5 animate-pulse">
              <div className="h-4 w-48 bg-white/10 rounded mb-2" />
              <div className="h-3 w-32 bg-white/5 rounded" />
            </GlassCard>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">No tenants yet. Create your first tenant to get started.</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4 bg-primary text-primary-foreground hover:brightness-110 text-xs">
            Create Tenant
          </Button>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">Name</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden md:table-cell">Sessions</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-xs font-semibold text-primary">{tenant.name[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <Link href={`/dashboard/tenants/${tenant.id}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                            {tenant.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tenant.active ? 'bg-emerald/10 text-emerald' : 'bg-white/[0.05] text-muted-foreground'}`}>
                        {tenant.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{tenant._count.sessions}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(tenant)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" title={tenant.active ? 'Deactivate' : 'Activate'}>
                          {tenant.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </button>
                        <Link href={`/dashboard/tenants/${tenant.id}`} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" title="Manage">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

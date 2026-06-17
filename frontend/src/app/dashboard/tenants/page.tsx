'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Plus, ExternalLink, Power, PowerOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
      toast.success('Tenant created successfully')
    } catch (error) {
      console.error('Failed to create tenant:', error)
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your WhatsApp AI tenants</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="glass-button text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/[0.10] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Tenant</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a new tenant to manage WhatsApp sessions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="py-4">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full glass-input"
                  placeholder="e.g., Eggeez Support"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setShowCreate(false)} variant="ghost" className="text-muted-foreground">
                  Cancel
                </Button>
                <Button type="submit" className="glass-button">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="glass rounded-xl p-8 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No tenants yet. Create your first tenant to get started.</p>
          <Button onClick={() => setShowCreate(true)} className="glass-button mt-4 text-xs">
            Create Tenant
          </Button>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">Name</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden md:table-cell">Sessions</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden md:table-cell">Contacts</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3 hidden lg:table-cell">Messages</th>
                  <th className="text-right text-xs text-muted-foreground font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {tenant.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/tenants/${tenant.id}`}
                            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
                          >
                            {tenant.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(tenant.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tenant.active
                          ? 'bg-emerald/10 text-emerald'
                          : 'bg-white/[0.05] text-muted-foreground'
                      }`}>
                        {tenant.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{tenant._count.sessions}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{tenant._count.contacts}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden lg:table-cell">{tenant._count.messages}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(tenant)}
                          className="glass-button-ghost p-1.5"
                          title={tenant.active ? 'Deactivate' : 'Activate'}
                        >
                          {tenant.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </button>
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          className="glass-button-ghost p-1.5"
                          title="Manage"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'

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
    } catch (error) {
      console.error('Failed to create tenant:', error)
    }
  }

  async function toggleActive(tenant: Tenant) {
    await api.tenants.update(tenant.id, { active: !tenant.active })
    await loadTenants()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-light text-snow tracking-tight">Tenants</h1>
          <p className="text-sm text-fog mt-1">Manage your WhatsApp AI tenants</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + New Tenant
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card-surface p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-fog mb-1">Tenant Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full input-surface rounded-buttons px-3 py-2 text-sm text-snow focus:outline-none"
              placeholder="e.g., Eggeez Support"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary text-xs">Create</button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-xs">Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-fog">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-fog">No tenants yet. Create your first tenant to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="card-surface p-4 flex items-center justify-between">
              <div>
                <Link
                  href={`/dashboard/tenants/${tenant.id}`}
                  className="text-sm text-snow hover:text-acid-lime transition-colors font-medium"
                >
                  {tenant.name}
                </Link>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-fog">{tenant._count.sessions} sessions</span>
                  <span className="text-xs text-fog">{tenant._count.contacts} contacts</span>
                  <span className="text-xs text-fog">{tenant._count.messages} messages</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tenant.active ? 'bg-emerald/10 text-emerald' : 'bg-iron text-fog'
                }`}>
                  {tenant.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(tenant)}
                  className={`text-xs ${tenant.active ? 'text-crimson' : 'text-emerald'}`}
                >
                  {tenant.active ? 'Deactivate' : 'Activate'}
                </button>
                <Link
                  href={`/dashboard/tenants/${tenant.id}`}
                  className="btn-ghost text-xs"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

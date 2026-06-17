'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface DashboardStats {
  tenants: number
  activeSessions: number
  totalSessions: number
  contacts: number
  messages: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const tenantsData = await api.tenants.list()
        const sessionsData = await api.sessions.list()
        const contactsData = await api.contacts.list()
        const messagesData = await api.messages.list({ limit: 1 })

        setStats({
          tenants: tenantsData.tenants.length,
          activeSessions: sessionsData.sessions.filter((s: any) => s.status === 'CONNECTED').length,
          totalSessions: sessionsData.sessions.length,
          contacts: contactsData.contacts.length,
          messages: messagesData.messages.length,
        })
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }

    loadStats()
  }, [])

  const statCards = [
    { label: 'Tenants', value: stats?.tenants ?? '-', href: '/dashboard/tenants', color: 'text-indigo' },
    { label: 'Active Sessions', value: stats?.activeSessions ?? '-', href: '/dashboard/tenants', color: 'text-acid-lime' },
    { label: 'Total Sessions', value: stats?.totalSessions ?? '-', href: '/dashboard/tenants', color: 'text-snow' },
    { label: 'Contacts', value: stats?.contacts ?? '-', href: '/dashboard/contacts', color: 'text-cyan' },
    { label: 'Messages', value: stats?.messages ?? '-', href: '/dashboard/messages', color: 'text-mist' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-light text-snow tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-fog mt-1">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card-surface p-4 hover:bg-obsidian/80 transition-colors"
          >
            <div className="text-2xl font-light tracking-tight mb-1">{card.value}</div>
            <div className={`text-xs ${card.color}`}>{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 card-surface p-5">
        <h2 className="text-sm font-medium text-snow mb-2">WhatsApp AI Platform</h2>
        <p className="text-xs text-fog leading-relaxed">
          Manage your multi-tenant WhatsApp AI agents. Create tenants, configure AI prompts,
          connect WhatsApp sessions, and monitor conversations — all from a single dashboard.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard/tenants" className="btn-primary text-xs">
            Create Tenant
          </Link>
          <Link href="/dashboard/tenants" className="btn-secondary text-xs">
            View Sessions
          </Link>
        </div>
      </div>
    </div>
  )
}

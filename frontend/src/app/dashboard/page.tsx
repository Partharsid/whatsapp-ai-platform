'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  Building2,
  Wifi,
  Users,
  MessageSquare,
  Activity,
  ArrowRight,
} from 'lucide-react'

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
    { label: 'Tenants', value: stats?.tenants ?? '-', href: '/dashboard/tenants', icon: Building2, color: 'from-primary/20 to-primary/5' },
    { label: 'Active Sessions', value: stats?.activeSessions ?? '-', href: '/dashboard/tenants', icon: Wifi, color: 'from-emerald/20 to-emerald/5' },
    { label: 'Total Sessions', value: stats?.totalSessions ?? '-', href: '/dashboard/tenants', icon: Activity, color: 'from-blue-400/20 to-blue-400/5' },
    { label: 'Contacts', value: stats?.contacts ?? '-', href: '/dashboard/contacts', icon: Users, color: 'from-cyan/20 to-cyan/5' },
    { label: 'Messages', value: stats?.messages ?? '-', href: '/dashboard/messages', icon: MessageSquare, color: 'from-purple-400/20 to-purple-400/5' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              href={card.href}
              className="glass rounded-xl p-5 glass-hover group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-foreground/70" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground mb-1">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">WhatsApp AI Platform</h2>
          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.05]">v1.0</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Manage your multi-tenant WhatsApp AI agents. Create tenants, configure AI prompts,
          connect WhatsApp sessions, and monitor conversations — all from a single dashboard.
        </p>
        <div className="mt-5 flex gap-3">
          <Link href="/dashboard/tenants" className="glass-button text-xs inline-flex items-center gap-1.5">
            Create Tenant <ArrowRight className="w-3 h-3" />
          </Link>
          <Link href="/dashboard/tenants" className="glass-button-secondary text-xs">
            View Sessions
          </Link>
        </div>
      </div>
    </div>
  )
}

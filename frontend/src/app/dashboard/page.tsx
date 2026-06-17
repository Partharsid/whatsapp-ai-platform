'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card'
import { Building2, Wifi, Users, MessageSquare, Activity, ArrowRight } from 'lucide-react'

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
        const [tenantsData, sessionsData, contactsData, messagesData] = await Promise.all([
          api.tenants.list(),
          api.sessions.list(),
          api.contacts.list(),
          api.messages.list({ limit: 1 }),
        ])
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
    { label: 'Tenants', value: stats?.tenants, href: '/dashboard/tenants', icon: Building2 },
    { label: 'Active', value: stats?.activeSessions, href: '/dashboard/tenants', icon: Wifi },
    { label: 'Sessions', value: stats?.totalSessions, href: '/dashboard/tenants', icon: Activity },
    { label: 'Contacts', value: stats?.contacts, href: '/dashboard/contacts', icon: Users },
    { label: 'Messages', value: stats?.messages, href: '/dashboard/messages', icon: MessageSquare },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.href} className="group">
              <GlassCard className="p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                    <Icon className="h-5 w-5 text-foreground/70" />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground mb-1">
                  {card.value ?? '-'}
                </div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
              </GlassCard>
            </Link>
          )
        })}
      </div>

      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <GlassCardTitle>WhatsApp AI Platform</GlassCardTitle>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-white/[0.05]">v1.0</span>
          </div>
          <GlassCardDescription>
            Manage your multi-tenant WhatsApp AI agents. Create tenants, configure AI prompts,
            connect WhatsApp sessions, and monitor conversations.
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="flex gap-3">
          <Link href="/dashboard/tenants" className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground px-4 text-xs font-medium hover:brightness-110 transition-all">
            Create Tenant <ArrowRight className="h-3 w-3" />
          </Link>
          <Link href="/dashboard/tenants" className="inline-flex items-center h-9 rounded-lg border border-white/[0.10] px-4 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all">
            View Sessions
          </Link>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}

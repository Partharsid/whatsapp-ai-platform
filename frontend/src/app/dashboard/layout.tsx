'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '⊞' },
  { href: '/dashboard/tenants', label: 'Tenants', icon: '◈' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '◉' },
  { href: '/dashboard/messages', label: 'Messages', icon: '☰' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-fog text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-onyx flex">
      <aside className="w-56 bg-charcoal border-r border-graphite flex flex-col">
        <div className="p-4 border-b border-graphite">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-acid-lime" />
            <span className="text-sm font-medium text-snow tracking-tight">WA AI</span>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-obsidian text-snow'
                    : 'text-fog hover:text-snow hover:bg-obsidian/50'
                }`}
              >
                <span className="w-4 text-center text-xs">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-graphite">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-5 h-5 rounded-full bg-indigo flex items-center justify-center text-[10px] text-snow font-medium">
              {user.email[0].toUpperCase()}
            </div>
            <span className="text-xs text-fog truncate">{user.email}</span>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-fog hover:text-crimson transition-colors px-1 py-1"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

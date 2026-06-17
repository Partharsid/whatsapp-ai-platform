'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mail,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
  { href: '/dashboard/contacts', label: 'Contacts', icon: MessageSquare },
  { href: '/dashboard/messages', label: 'Messages', icon: Mail },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass rounded-xl p-6">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`glass-nav flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        <div className={`p-4 border-b border-white/[0.06] flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground tracking-tight">WA AI</span>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'glass text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all duration-200 mb-2"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-2 w-full p-2 rounded-lg hover:bg-white/[0.03] transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}>
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-accent/20 text-accent-foreground text-xs">
                    {user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="text-xs text-muted-foreground truncate flex-1 text-left">{user.email}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass border-white/[0.10]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onClick={logout} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-3 h-3 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass-nav border-b border-white/[0.06] h-14 flex items-center px-6 gap-4">
          <div className="flex-1" />
          <button className="glass-button-ghost p-2 rounded-lg relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 glass-button-ghost rounded-lg px-3 py-1.5">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-accent/20 text-accent-foreground text-[10px]">
                    {user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass border-white/[0.10]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onClick={logout} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-3 h-3 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

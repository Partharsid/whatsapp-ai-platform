import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'WhatsApp AI Platform',
  description: 'Multi-tenant WhatsApp AI Automation Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-onyx">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

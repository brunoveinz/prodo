'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NotificationProvider } from '@/components/ui/notification'
import Sidebar from './sidebar'
import SessionIndicator from './session-indicator'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const stored = window.localStorage.getItem('prodo_sidebar_collapsed')
    setCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('prodo_sidebar_collapsed', String(collapsed))
  }, [collapsed])

  // Lightweight auth check for layout decisions
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setIsAuthenticated(!!data?.user)
      })
      .catch(() => setIsAuthenticated(false))
  }, [pathname])

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isLanding = pathname === '/' && isAuthenticated === false
  const showChrome = !isAuthPage && !isLanding && isAuthenticated === true

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          {showChrome && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />}
          <main className={`flex-1 transition-all duration-300 ease-in-out ${showChrome ? (collapsed ? 'ml-20' : 'ml-64') : ''}`}>
            {children}
          </main>
        </div>
        {showChrome && <SessionIndicator />}
      </div>
    </NotificationProvider>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ActiveSession {
  taskId: string
  objectiveId: string
  taskTitle?: string
  durationMinutes: string
  route: string
}

const STORAGE_KEY = 'prodo_active_session'

export default function SessionIndicator() {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const t = useTranslations('Session.Indicator')

  useEffect(() => {
    const loadSession = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          setActiveSession(JSON.parse(stored))
        } catch {
          setActiveSession(null)
        }
      } else {
        setActiveSession(null)
      }
    }

    loadSession()
    window.addEventListener('storage', loadSession)
    return () => window.removeEventListener('storage', loadSession)
  }, [])

  if (!activeSession) {
    return null
  }

  function handleDismiss() {
    window.localStorage.removeItem(STORAGE_KEY)
    setActiveSession(null)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100%-1.5rem)] max-w-xs rounded-[2rem] border border-border bg-card/95 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-primary/10 p-3 text-primary">
            <Clock className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('activeTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('activeSub')}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar indicador de sesión"
          onClick={handleDismiss}
          className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-border bg-muted px-4 py-3">
        <div>
          <p className="font-semibold text-foreground truncate">{activeSession.taskTitle || t('activeTask')}</p>
          <p className="text-xs text-muted-foreground">{activeSession.durationMinutes} {t('minutes')}</p>
        </div>
        <Link
          href={activeSession.route}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {t('returnBtn')}
        </Link>
      </div>
    </div>
  )
}

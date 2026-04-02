'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Target, CalendarDays } from 'lucide-react'

export default function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'plan'

  function setView(view: string) {
    router.push(`/?view=${view}`)
  }

  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-[3px]">
      <button
        onClick={() => setView('objectives')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          currentView === 'objectives'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Target className="size-3.5" />
        Objetivos
      </button>
      <button
        onClick={() => setView('plan')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
          currentView === 'plan'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <CalendarDays className="size-3.5" />
        Plan del Dia
      </button>
    </div>
  )
}

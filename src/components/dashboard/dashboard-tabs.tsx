'use client'

import { useRouter } from 'next/navigation'
import { BarChart3, CalendarDays } from 'lucide-react'
import PeriodSelector from './period-selector'
import { useTranslations } from 'next-intl'

interface DashboardTabsProps {
  currentTab: string
  currentPeriod: 7 | 30
}

export default function DashboardTabs({ currentTab, currentPeriod }: DashboardTabsProps) {
  const router = useRouter()
  const t = useTranslations('Dashboard.tabs')

  return (
    <div className="flex items-center gap-4">
      {currentTab === 'charts' && <PeriodSelector currentPeriod={currentPeriod} />}

      <div className="inline-flex items-center rounded-lg bg-muted p-[3px]">
        <button
          onClick={() => router.push(`/dashboard?period=${currentPeriod}`)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            currentTab === 'charts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="size-3.5" />
          {t('charts')}
        </button>
        <button
          onClick={() => router.push('/dashboard?tab=calendar')}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            currentTab === 'calendar'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="size-3.5" />
          {t('calendar')}
        </button>
      </div>
    </div>
  )
}

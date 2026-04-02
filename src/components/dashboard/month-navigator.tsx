'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthNavigatorProps {
  year: number
  month: number
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function MonthNavigator({ year, month }: MonthNavigatorProps) {
  const router = useRouter()

  function navigate(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    } else if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    const m = String(newMonth).padStart(2, '0')
    router.push(`/dashboard?tab=calendar&month=${newYear}-${m}`)
  }

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <ChevronLeft className="size-4 text-muted-foreground" />
      </button>
      <span className="text-sm font-semibold text-foreground min-w-[140px] text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect, useTransition } from 'react'
import { getDayDetail } from '@/actions/sessions'
import MonthNavigator from './month-navigator'
import { Loader2, Clock, Zap, Target } from 'lucide-react'
import { useTranslations } from 'next-intl'

type CalendarDay = {
  date: string
  sessionCount: number
  hours: number
  objectiveColors: string[]
}

type DayDetailItem = {
  taskTitle: string
  objectiveName: string
  objectiveColor: string
  sessionCount: number
  totalMinutes: number
  distractionCount: number
}

interface CalendarViewProps {
  year: number
  month: number
  data: CalendarDay[]
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export default function CalendarView({ year, month, data }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetailItem[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Dashboard.calendar')

  // Build a lookup map: date string -> day data
  const dayMap = new Map<string, CalendarDay>()
  for (const d of data) {
    dayMap.set(d.date, d)
  }

  // Calendar grid computation
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete the last week
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const todayStr =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? String(today.getDate())
      : null

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (selectedDate === dateStr) {
      setSelectedDate(null)
      setDayDetail(null)
      return
    }
    setSelectedDate(dateStr)
    setDayDetail(null)
    startTransition(async () => {
      const detail = await getDayDetail(dateStr)
      setDayDetail(detail)
    })
  }

  // Reset selection when month changes
  useEffect(() => {
    setSelectedDate(null)
    setDayDetail(null)
  }, [year, month])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <MonthNavigator year={year} month={month} />
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/40 bg-card/20 overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-border/40">
          {DAY_KEYS.map((key) => (
            <div key={key} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t(`days.${key}`)}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-20 border-b border-r border-border/20" />
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayData = dayMap.get(dateStr)
            const isToday = todayStr === String(day)
            const isSelected = selectedDate === dateStr

            return (
              <button
                key={day}
                onClick={() => dayData && handleDayClick(day)}
                className={`relative h-20 p-1.5 border-b border-r border-border/20 text-left transition-all ${
                  dayData ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'
                } ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                      : dayData
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'
                  }`}
                >
                  {day}
                </span>

                {dayData && (
                  <div className="mt-1 space-y-1">
                    {/* Color dots */}
                    <div className="flex gap-0.5 flex-wrap">
                      {dayData.objectiveColors.slice(0, 4).map((color, ci) => (
                        <div
                          key={ci}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {/* Session count */}
                    <p className="text-[10px] text-muted-foreground">
                      {dayData.sessionCount}{t('ses')} · {dayData.hours.toFixed(1)}h
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button
              onClick={() => { setSelectedDate(null); setDayDetail(null) }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('close')}
            </button>
          </div>

          {isPending || !dayDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : dayDetail.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('empty')}</p>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <Clock className="size-3.5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {dayDetail.reduce((s, d) => s + d.sessionCount, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t('sessions')}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <Target className="size-3.5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {(dayDetail.reduce((s, d) => s + d.totalMinutes, 0) / 60).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t('hours')}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <Zap className="size-3.5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">
                    {dayDetail.reduce((s, d) => s + d.distractionCount, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t('distractions')}</p>
                </div>
              </div>

              {/* Task breakdown */}
              <div className="space-y-2">
                {dayDetail.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 bg-muted/20"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.objectiveColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.taskTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{item.objectiveName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-foreground">
                        {item.sessionCount} {t('ses')} · {item.totalMinutes}{t('min')}
                      </p>
                      {item.distractionCount > 0 && (
                        <p className="text-[10px] text-destructive">{item.distractionCount} {t('distr')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

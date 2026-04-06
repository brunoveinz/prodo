import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardData, getCalendarData } from '@/actions/sessions'
import HoursBarChart from '@/components/dashboard/hours-bar-chart'
import ObjectivePieChart from '@/components/dashboard/objective-pie-chart'
import DistractionMetric from '@/components/dashboard/distraction-metric'
import PeriodSelector from '@/components/dashboard/period-selector'
import CalendarView from '@/components/dashboard/calendar-view'
import DashboardTabs from '@/components/dashboard/dashboard-tabs'
import { Timer, BarChart3, Clock, Target, Zap, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'

interface DashboardPageProps {
  searchParams: Promise<{
    period?: '7' | '30'
    tab?: 'charts' | 'calendar'
    month?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  const t = await getTranslations('Dashboard')

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const period = (params.period === '30' ? 30 : 7) as 7 | 30
  const tab = params.tab || 'charts'

  // Parse month param for calendar (default: current month)
  const now = new Date()
  let calYear = now.getFullYear()
  let calMonth = now.getMonth() + 1
  if (params.month) {
    const [y, m] = params.month.split('-').map(Number)
    if (y && m && m >= 1 && m <= 12) {
      calYear = y
      calMonth = m
    }
  }

  const [data, calendarData] = await Promise.all([
    getDashboardData(period),
    tab === 'calendar' ? getCalendarData(calYear, calMonth) : Promise.resolve([]),
  ])

  const totalSessions = data.dailyHours.length > 0
    ? data.dailyHours.reduce((sum, d) => sum + Math.ceil(d.hours * 60 / 25), 0)
    : 0
  const totalHours = data.dailyHours.reduce((sum, d) => sum + d.hours, 0)

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              PRODO
            </p>
            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <DashboardTabs currentTab={tab} currentPeriod={period} />
        </div>

        {tab === 'calendar' && (
          <CalendarView year={calYear} month={calMonth} data={calendarData} />
        )}

        {tab === 'charts' && <>
        {/* Stats overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">{t('sessions')}</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-chart-2/10">
              <Target className="size-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{t('productiveHours')}</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-destructive/10">
              <Zap className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.avgDistractions.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{t('avgDistractions')}</p>
            </div>
          </Card>
          <Card className="p-5 rounded-3xl border border-border bg-muted/80">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-2xl bg-primary/10 p-3 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t('quickTip')}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('quickTipText')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {data.dailyHours.length > 0 ? (
          <>
            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distraction metric */}
              <DistractionMetric avgDistractions={data.avgDistractions} />

              {/* Hours bar chart */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('productiveHoursChart')}
                  </h3>
                </div>
                <HoursBarChart data={data.dailyHours} />
              </Card>
            </div>

            {/* Objective pie chart */}
            {data.objectiveBreakdown.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('timeByObjective')}
                  </h3>
                </div>
                <ObjectivePieChart data={data.objectiveBreakdown} />
              </Card>
            )}
          </>
        ) : (
          /* Empty state */
          <Card className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-muted">
              <BarChart3 className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-foreground font-medium">
                {t('noData')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('noDataSub')}
              </p>
            </div>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Timer className="size-4" />
              {t('goFocus')}
            </Link>
          </Card>
        )}
        </>}
      </main>
    </div>
  )
}

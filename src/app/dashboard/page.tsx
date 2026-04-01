import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardData } from '@/actions/sessions'
import HoursBarChart from '@/components/dashboard/hours-bar-chart'
import ObjectivePieChart from '@/components/dashboard/objective-pie-chart'
import DistractionMetric from '@/components/dashboard/distraction-metric'
import PeriodSelector from '@/components/dashboard/period-selector'

interface DashboardPageProps {
  searchParams: Promise<{
    period?: '7' | '30'
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const period = (params.period === '30' ? 30 : 7) as 7 | 30

  const data = await getDashboardData(period)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-black">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Focus
            </Link>
            <Link
              href="/api/auth/signout"
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Period selector */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Analytics
          </h2>
          <PeriodSelector currentPeriod={period} />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Distraction metric */}
          <DistractionMetric avgDistractions={data.avgDistractions} />

          {/* Hours bar chart */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Productive Hours
            </h3>
            <HoursBarChart data={data.dailyHours} />
          </div>
        </div>

        {/* Objective pie chart - full width */}
        {data.objectiveBreakdown.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Time by Objective
            </h3>
            <ObjectivePieChart data={data.objectiveBreakdown} />
          </div>
        )}

        {/* Empty state */}
        {data.dailyHours.length === 0 && (
          <div className="mt-8 text-center p-12 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No data yet. Start a Pomodoro session to see your analytics.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Focus
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

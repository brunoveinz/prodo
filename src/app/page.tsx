import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getObjectives } from '@/actions/objectives'
import { getTasksByObjective } from '@/actions/tasks'
import ObjectiveSelector from '@/components/objective-selector'
import TaskSelector from '@/components/task-selector'

interface PageProps {
  searchParams: Promise<{
    objective?: string
    task?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const params = await searchParams
  const selectedObjectiveId = params.objective
  const selectedTaskId = params.task

  const objectives = await getObjectives()

  let tasks = []
  if (selectedObjectiveId) {
    tasks = await getTasksByObjective(selectedObjectiveId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-black">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            FocusTracker Pro
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Dashboard
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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Objectives */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Macro Objectives
            </h2>
            <ObjectiveSelector objectives={objectives} selectedId={selectedObjectiveId} />
          </div>

          {/* Tasks & Timer */}
          {selectedObjectiveId ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Tasks
              </h2>
              <TaskSelector
                objectives={objectives}
                objectiveId={selectedObjectiveId}
                tasks={tasks}
                selectedTaskId={selectedTaskId}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">
                Select a macro objective to see tasks
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

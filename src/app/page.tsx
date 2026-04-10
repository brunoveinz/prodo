import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getObjectives } from '@/actions/objectives'
import { getTasksByObjective, getBacklogTasks } from '@/actions/tasks'
import { getTodaysPlan } from '@/actions/daily-plan'
import { getTaskComments } from '@/actions/comments'
import ObjectiveSelector from '@/components/objective-selector'
import TaskSelector from '@/components/task-selector'
import NewTaskPanel from '@/components/new-task-panel'
import DailyPlan from '@/components/daily-plan'
import JornadaLauncher from '@/components/jornada-launcher'
import ViewToggle from '@/components/view-toggle'
import GuestTimer from '@/components/guest-timer'
import { Card } from '@/components/ui/card'
import { Target } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import LanguageSwitcher from '@/components/language-switcher'

interface PageProps {
  searchParams: Promise<{
    objective?: string
    task?: string
    duration?: string
    view?: string
    from?: string
  }>
}

export default async function Page({ searchParams }: PageProps) {
  const session = await auth()
  const t = await getTranslations('Workspace')

  // --- Unauthenticated: Landing with guest deep work ---
  if (!session) {
    return <LandingPage />
  }

  // --- Authenticated: Workspace ---
  const params = await searchParams
  const selectedObjectiveId = params.objective
  const selectedTaskId = params.task
  const duration = params.duration || '25'
  const view = params.view || 'plan'

  const objectives = await getObjectives()

  let tasks: Awaited<ReturnType<typeof getTasksByObjective>> = []
  if (selectedObjectiveId) {
    tasks = await getTasksByObjective(selectedObjectiveId)
  }

  const planItems = await getTodaysPlan()
  const backlogItems = await getBacklogTasks()

  // Load comments for today's plan tasks
  const commentsMap: Record<string, Awaited<ReturnType<typeof getTaskComments>>> = {}
  await Promise.all(
    planItems.map(async (item) => {
      commentsMap[item.taskId] = await getTaskComments(item.taskId)
    })
  )

  return (
    <main className="mx-auto max-w-[56rem] px-4 sm:px-6 py-12 space-y-12">
      <section className="border-b border-border/40 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/40 bg-secondary/10 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
              <Target className="size-3" />
              <span>{t('badge')}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground/80 max-w-sm">
              {t('subtitle')}
            </p>
          </div>
          {!selectedObjectiveId && objectives.length > 0 && (
            <ViewToggle />
          )}
        </div>
      </section>

      {objectives.length === 0 ? (
        <div className="pt-6">
          <ObjectiveSelector objectives={objectives} selectedId={selectedObjectiveId} />
        </div>
      ) : (
        <>
          <NewTaskPanel objectives={objectives} />

          {view === 'plan' && !selectedObjectiveId && (
            <>
              <JornadaLauncher
                tasks={planItems
                  .filter((i) => !i.isCompleted)
                  .map((i) => ({
                    taskId: i.taskId,
                    taskTitle: i.taskTitle,
                    objectiveId: i.objectiveId,
                    objectiveColor: i.objectiveColor,
                    planItemId: i.id,
                  }))}
              />
              <DailyPlan items={planItems} backlogItems={backlogItems} commentsMap={commentsMap} objectives={objectives} />
            </>
          )}

          {view !== 'plan' && !selectedObjectiveId && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground/60" />
                <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase opacity-80">{t('yourObjectives')}</h2>
              </div>
              <ObjectiveSelector objectives={objectives} selectedId={selectedObjectiveId} />
            </div>
          )}

          {selectedObjectiveId && (() => {
            const upcoming = planItems
              .filter((i) => !i.isCompleted && i.taskId !== selectedTaskId)
              .slice(0, 4)
              .map((i) => ({ taskTitle: i.taskTitle, objectiveColor: i.objectiveColor }))

            return (
              <TaskSelector
                objectives={objectives}
                objectiveId={selectedObjectiveId}
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                defaultDuration={parseInt(duration, 10) || 25}
                fromPlan={params.from === 'plan'}
                upcomingTasks={upcoming}
              />
            )
          })()}

          {view !== 'plan' && !selectedObjectiveId && objectives.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('objectivesCreated', { count: objectives.length })}
                </p>
                <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
                  {t('viewAnalytics')}
                </Link>
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  )
}

async function LandingPage() {
  const t = await getTranslations('Landing')
  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-bold tracking-tight text-foreground">PRODO</span>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
          >
            {t('login')}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <GuestTimer />
      </main>

      {/* Footer hint */}
      <footer className="pb-6 text-center">
        <p className="text-xs text-muted-foreground/40">
          <Link href="/register" className="underline underline-offset-2 hover:text-muted-foreground/60 transition">
            {t('createAccount')}
          </Link>{' '}
          {t('saveSessions')}
        </p>
      </footer>
    </div>
  )
}

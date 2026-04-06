import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getObjectives } from '@/actions/objectives'
import { getTasksByObjective } from '@/actions/tasks'
import { getTodaysPlan } from '@/actions/daily-plan'
import ObjectiveSelector from '@/components/objective-selector'
import TaskSelector from '@/components/task-selector'
import NewTaskPanel from '@/components/new-task-panel'
import DailyPlan from '@/components/daily-plan'
import JornadaLauncher from '@/components/jornada-launcher'
import ViewToggle from '@/components/view-toggle'
import GuestTimer from '@/components/guest-timer'
import { Card } from '@/components/ui/card'
import { Target } from 'lucide-react'

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

  return (
    <main className="mx-auto max-w-[56rem] px-4 sm:px-6 py-12 space-y-12">
      <section className="border-b border-border/40 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/40 bg-secondary/10 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
              <Target className="size-3" />
              <span>Workspace</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
              Focus & Build
            </h1>
            <p className="text-sm text-muted-foreground/80 max-w-sm">
              Selecciona un objetivo y entra en la zona.
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
                  }))}
              />
              <DailyPlan items={planItems} />
            </>
          )}

          {view !== 'plan' && !selectedObjectiveId && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground/60" />
                <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase opacity-80">Your Objectives</h2>
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
                  {objectives.length} objective{objectives.length !== 1 ? 's' : ''} created
                </p>
                <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
                  View analytics →
                </Link>
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  )
}

function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-bold tracking-tight text-foreground">PRODO</span>
        <Link
          href="/login"
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
        >
          Iniciar sesion
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <GuestTimer />
      </main>

      {/* Footer hint */}
      <footer className="pb-6 text-center">
        <p className="text-xs text-muted-foreground/40">
          <Link href="/register" className="underline underline-offset-2 hover:text-muted-foreground/60 transition">
            Crea una cuenta
          </Link>{' '}
          para guardar tus sesiones y ver tus metricas.
        </p>
      </footer>
    </div>
  )
}

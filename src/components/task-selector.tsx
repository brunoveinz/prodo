import Link from 'next/link'
import { Objective, Task } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Circle, CheckCircle2, Play, ArrowLeft } from 'lucide-react'
import CreateTaskForm from './create-task-form'
import SessionLauncher from './session-launcher'

type UpcomingTask = {
  taskTitle: string
  objectiveColor: string
}

interface TaskSelectorProps {
  objectives: Objective[]
  objectiveId: string
  tasks: Task[]
  selectedTaskId?: string
  defaultDuration?: number
  fromPlan?: boolean
  upcomingTasks?: UpcomingTask[]
}

export default function TaskSelector({
  objectives,
  objectiveId,
  tasks,
  selectedTaskId,
  defaultDuration = 25,
  fromPlan = false,
  upcomingTasks = [],
}: TaskSelectorProps) {
  const objective = objectives.find((o) => o.id === objectiveId)
  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId)
    : undefined

  if (!objective) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Objective not found</p>
      </Card>
    )
  }

  if (selectedTaskId) {
    return (
      <div className="space-y-4">
        <Link
          href={fromPlan ? '/?view=plan' : `/?objective=${objectiveId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {fromPlan ? 'Volver al plan' : 'Back to tasks'}
        </Link>
        <SessionLauncher
          taskId={selectedTaskId}
          objectiveId={objectiveId}
          taskTitle={selectedTask?.title}
          defaultDuration={defaultDuration}
          themeColor={objective.color}
          upcomingTasks={upcomingTasks}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to objectives
      </Link>

      <Card className="p-4 border-border/40 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: objective.color }} 
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Objetivo activo
              </p>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {objective.name}
            </h2>
          </div>
          <span
            className="rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase border"
            style={{ 
              color: objective.color,
              borderColor: `${objective.color}40`,
              backgroundColor: `${objective.color}10`
            }}
          >
            {objective.status}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tareas
            </p>
            <p className="mt-0.5 text-xl font-bold text-foreground">{tasks.length}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-3 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Progreso
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {tasks.length > 0
                ? `${tasks.filter(t => t.isCompleted).length} de ${tasks.length} completadas`
                : 'Sin tareas'}
            </p>
          </div>
        </div>
      </Card>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
            <Circle className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No tasks yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Break this objective into actionable tasks and start focusing.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/20 shadow-sm">
          <div className="divide-y divide-border/40">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/?objective=${objectiveId}&task=${task.id}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-muted/40"
              >
                <div
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    task.isCompleted ? 'border-transparent' : 'border-muted-foreground/30 group-hover:border-muted-foreground/60'
                  }`}
                  style={{ backgroundColor: task.isCompleted ? objective.color : 'transparent' }}
                >
                  {task.isCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  )}
                </div>

                <span
                  className={`flex-1 text-[14px] ${
                    task.isCompleted
                      ? 'line-through text-muted-foreground/60'
                      : 'text-foreground font-medium'
                  }`}
                >
                  {task.title}
                </span>

                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100"
                  style={{ backgroundColor: `${objective.color}15` }}
                >
                  <Play
                    className="h-3 w-3 translate-x-px"
                    style={{ color: objective.color }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CreateTaskForm objectiveId={objectiveId} />
    </div>
  )
}

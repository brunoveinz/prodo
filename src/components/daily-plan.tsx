'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { completeTask } from '@/actions/tasks'
import { removeTaskFromPlan } from '@/actions/daily-plan'
import { Play, CheckCircle2, Circle, CalendarDays, X } from 'lucide-react'

type PlanItem = {
  id: string
  sortOrder: number
  taskId: string
  taskTitle: string
  isCompleted: boolean
  objectiveId: string
  objectiveName: string
  objectiveColor: string
}

interface DailyPlanProps {
  items: PlanItem[]
}

export default function DailyPlan({ items }: DailyPlanProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(taskId: string) {
    startTransition(async () => {
      await completeTask(taskId)
    })
  }

  function handleRemove(planItemId: string) {
    startTransition(async () => {
      await removeTaskFromPlan(planItemId)
    })
  }

  const completedCount = items.filter((i) => i.isCompleted).length
  const totalCount = items.length

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">Sin tareas para hoy</p>
        <p className="text-xs text-muted-foreground mt-1">
          Usa el boton + para agregar tareas al dia
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {completedCount} de {totalCount} completadas
        </p>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Task list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/50"
            >
              <button
                onClick={() => handleToggle(item.taskId)}
                disabled={isPending}
                className="shrink-0 cursor-pointer transition-colors"
              >
                {item.isCompleted ? (
                  <CheckCircle2
                    className="h-[18px] w-[18px]"
                    style={{ color: item.objectiveColor }}
                  />
                ) : (
                  <Circle className="h-[18px] w-[18px] text-muted-foreground/40 hover:text-muted-foreground/70" />
                )}
              </button>

              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.objectiveColor }}
              />

              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block truncate ${
                    item.isCompleted
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground font-medium'
                  }`}
                >
                  {item.taskTitle}
                </span>
                <span className="text-[11px] text-muted-foreground">{item.objectiveName}</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!item.isCompleted && (
                  <Link
                    href={`/?objective=${item.objectiveId}&task=${item.taskId}&from=plan`}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
                    style={{ backgroundColor: `${item.objectiveColor}15` }}
                  >
                    <Play
                      className="h-3 w-3 translate-x-px"
                      style={{ color: item.objectiveColor }}
                    />
                  </Link>
                )}
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground/50" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

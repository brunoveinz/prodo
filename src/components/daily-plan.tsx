'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { completeTask } from '@/actions/tasks'
import { removeTaskFromPlan, reorderPlanItems, addTaskToPlan } from '@/actions/daily-plan'
import { addTaskComment, deleteTaskComment } from '@/actions/comments'
import { createTask } from '@/actions/tasks'
import { Play, CheckCircle2, Circle, CalendarDays, X, GripVertical, MessageSquare, Send, Trash2, ChevronDown, ChevronRight, Plus, Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'

type PlanItem = {
  id: string
  sortOrder: number
  taskId: string
  taskTitle: string
  isCompleted: boolean
  estimatedPomodoros: number
  objectiveId: string
  objectiveName: string
  objectiveColor: string
}

type BacklogItem = {
  id: string
  title: string
  isCompleted: boolean
  estimatedPomodoros: number
  objectiveId: string
  objectiveName: string
  objectiveColor: string
}

type Comment = {
  id: string
  content: string
  createdAt: Date | null
}

type ObjectiveOption = {
  id: string
  name: string
  color: string
}

interface DailyPlanProps {
  items: PlanItem[]
  backlogItems: BacklogItem[]
  commentsMap: Record<string, Comment[]>
  objectives: ObjectiveOption[]
}

export default function DailyPlan({ items, backlogItems, commentsMap, objectives }: DailyPlanProps) {
  const [isPending, startTransition] = useTransition()
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [localItems, setLocalItems] = useState<PlanItem[] | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [showBacklog, setShowBacklog] = useState(false)
  const [showBacklogForm, setShowBacklogForm] = useState(false)
  const [backlogTitle, setBacklogTitle] = useState('')
  const [backlogObjectiveId, setBacklogObjectiveId] = useState(objectives[0]?.id || '')
  const [backlogPomodoros, setBacklogPomodoros] = useState(1)
  const router = useRouter()
  const t = useTranslations('Plan')

  const displayItems = localItems ?? items

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  function handleDragEnd() {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const reordered = [...displayItems]
      const [moved] = reordered.splice(dragIdx, 1)
      reordered.splice(dragOverIdx, 0, moved)
      setLocalItems(reordered)

      startTransition(async () => {
        await reorderPlanItems(reordered.map((i) => i.id))
        setLocalItems(null)
      })
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

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

  function handleAddToToday(taskId: string) {
    startTransition(async () => {
      await addTaskToPlan(taskId)
      router.refresh()
    })
  }

  function handleAddComment(taskId: string) {
    if (!commentInput.trim()) return
    startTransition(async () => {
      await addTaskComment(taskId, commentInput)
      setCommentInput('')
      router.refresh()
    })
  }

  function handleCreateBacklogTask() {
    if (!backlogTitle.trim() || !backlogObjectiveId) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('objectiveId', backlogObjectiveId)
      formData.append('title', backlogTitle.trim())
      formData.append('estimatedPomodoros', backlogPomodoros.toString())
      await createTask(formData)
      setBacklogTitle('')
      setBacklogPomodoros(1)
      setShowBacklogForm(false)
      router.refresh()
    })
  }

  function handleDeleteComment(commentId: string) {
    startTransition(async () => {
      await deleteTaskComment(commentId)
      router.refresh()
    })
  }

  const completedCount = items.filter((i) => i.isCompleted).length
  const totalCount = items.length

  return (
    <div className="space-y-6">
      {/* Today's Plan */}
      <div className="space-y-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('emptySub')}
            </p>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {t('completedOf', { completed: completedCount, total: totalCount })}
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
                {displayItems.map((item, idx) => {
                  const isExpanded = expandedTaskId === item.taskId
                  const taskComments = commentsMap[item.taskId] || []

                  return (
                    <div key={item.id}>
                      <div
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/50 ${
                          dragIdx === idx ? 'opacity-50' : ''
                        } ${dragOverIdx === idx && dragIdx !== idx ? 'border-t-2 border-primary' : ''}`}
                      >
                        <div className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                          <GripVertical className="h-4 w-4" />
                        </div>
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
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{item.objectiveName}</span>
                            {item.estimatedPomodoros > 1 && (
                              <span className="text-[11px] text-muted-foreground">· {item.estimatedPomodoros} 🍅</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setExpandedTaskId(isExpanded ? null : item.taskId)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                              isExpanded ? 'bg-primary/10 text-primary' : 'hover:bg-muted/80 text-muted-foreground/50'
                            }`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {taskComments.length > 0 && (
                              <span className="absolute -top-1 -right-1 text-[9px] font-bold text-primary">
                                {taskComments.length}
                              </span>
                            )}
                          </button>
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

                      {/* Comments panel */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-muted/20 border-t border-border/50 animate-in slide-in-from-top-1 duration-150">
                          {taskComments.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {taskComments.map((comment) => (
                                <div key={comment.id} className="group/comment flex items-start gap-2 text-xs">
                                  <div className="flex-1 rounded-lg bg-card border border-border/40 px-3 py-2">
                                    <p className="text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                                    {comment.createdAt && (
                                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                                        {new Date(comment.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    disabled={isPending}
                                    className="shrink-0 opacity-0 group-hover/comment:opacity-100 mt-1 p-1 rounded hover:bg-destructive/10 transition-all"
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground/40" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(item.taskId) }}
                              placeholder={t('addComment')}
                              className="flex-1 h-8 rounded-lg border border-border/40 bg-card px-3 text-xs text-foreground outline-none focus:border-primary transition-colors"
                            />
                            <button
                              onClick={() => handleAddComment(item.taskId)}
                              disabled={isPending || !commentInput.trim()}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Backlog Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showBacklog ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Inbox className="h-4 w-4" />
            {t('backlog')} ({backlogItems.length})
          </button>
          {showBacklog && (
            <button
              onClick={() => setShowBacklogForm(!showBacklogForm)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('newBacklogTask')}
            </button>
          )}
        </div>

        {showBacklog && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Inline form to create backlog task */}
            {showBacklogForm && (
              <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-3">
                <input
                  type="text"
                  value={backlogTitle}
                  onChange={(e) => setBacklogTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBacklogTask() }}
                  placeholder={t('backlogTaskPlaceholder')}
                  className="w-full h-9 rounded-lg border border-border/40 bg-secondary/20 px-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                  autoFocus
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={backlogObjectiveId}
                    onChange={(e) => setBacklogObjectiveId(e.target.value)}
                    className="h-9 rounded-lg border border-border/40 bg-secondary/20 px-2 text-xs text-foreground outline-none focus:border-primary appearance-none"
                  >
                    {objectives.map((obj) => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBacklogPomodoros(Math.max(1, backlogPomodoros - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-sm"
                    >-</button>
                    <span className="text-xs font-medium text-foreground min-w-[2.5rem] text-center tabular-nums">{backlogPomodoros} 🍅</span>
                    <button
                      type="button"
                      onClick={() => setBacklogPomodoros(Math.min(10, backlogPomodoros + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-sm"
                    >+</button>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => { setShowBacklogForm(false); setBacklogTitle('') }}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      {t('cancelBacklog')}
                    </button>
                    <button
                      onClick={handleCreateBacklogTask}
                      disabled={isPending || !backlogTitle.trim()}
                      className="h-8 px-4 rounded-lg text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                      {t('addBacklog')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Backlog items list */}
            {backlogItems.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm">
                <div className="divide-y divide-border/40">
                  {backlogItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-muted/30"
                    >
                      <button
                        onClick={() => handleToggle(item.id)}
                        disabled={isPending}
                        className="shrink-0 cursor-pointer transition-colors"
                      >
                        <Circle className="h-[18px] w-[18px] text-muted-foreground/40 hover:text-muted-foreground/70" />
                      </button>

                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.objectiveColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground/80 block truncate">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{item.objectiveName}</span>
                          {item.estimatedPomodoros > 1 && (
                            <span className="text-[11px] text-muted-foreground">· {item.estimatedPomodoros} 🍅</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToToday(item.id)}
                        disabled={isPending}
                        className="shrink-0 flex h-8 items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        {t('addToday')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : !showBacklogForm && (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">{t('emptyBacklog')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

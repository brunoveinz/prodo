'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/actions/tasks'
import { addTaskToPlan } from '@/actions/daily-plan'
import { useToast } from '@/components/ui/notification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Objective } from '@/lib/types'

interface NewTaskPanelProps {
  objectives: Objective[]
}

export default function NewTaskPanel({ objectives }: NewTaskPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [objectiveId, setObjectiveId] = useState(objectives[0]?.id || '')
  const [pomodoros, setPomodoros] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()
  const router = useRouter()
  const t = useTranslations('Forms.Tasks')

  const selectedObjective = objectives.find(o => o.id === objectiveId) || objectives[0]
  const themeColor = selectedObjective?.color || '#ffffff'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!title.trim() || !objectiveId) {
      toast({
        title: t('missingData'),
        description: t('missingDataDesc'),
        variant: 'error',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('objectiveId', objectiveId)
      formData.append('title', title.trim())
      formData.append('estimatedPomodoros', pomodoros.toString())
      const task = await createTask(formData)
      await addTaskToPlan(task.id)

      toast({
        title: t('successTitle'),
        description: t('successPlan'),
        variant: 'success',
      })

      setTitle('')
      setPomodoros(1)
      setIsSubmitting(false)
      setIsOpen(false)
      router.push('/?view=plan')
    } catch (error) {
      setIsSubmitting(false)
      toast({
        title: t('errorTitle'),
        description: (error as Error)?.message || t('errorDesc'),
        variant: 'error',
      })
    }
  }

  if (objectives.length === 0) {
    return null
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 right-8 z-40 h-[38px] rounded-full px-4 shadow-lg text-white font-medium hover:scale-105 transition-all outline-none border-none ring-0"
        style={{ backgroundColor: themeColor, boxShadow: `0 4px 14px ${themeColor}40` }}
      >
        <Plus className="mr-1.5 h-4 w-4" /> {t('createTask')}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t('newTask')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('newTaskSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-muted text-muted-foreground transition-colors"
                title={t('close')}
              >
                {t('close')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="taskTitle" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{t('title')}</Label>
                <Input
                  id="taskTitle"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('titlePlaceholder')}
                  className="mt-1 h-11 rounded-xl bg-secondary/20 border-border/40 text-sm shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-primary"
                  autoFocus
                />
              </div>

              <div className="grid gap-5">
                <div>
                  <Label htmlFor="objective" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{t('objective')}</Label>
                  <select
                    id="objective"
                    value={objectiveId}
                    onChange={(event) => setObjectiveId(event.target.value)}
                    className="mt-1 block w-full h-11 rounded-xl border border-border/40 bg-secondary/20 px-3 text-sm text-foreground shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                  >
                    {objectives.map((objective) => (
                      <option key={objective.id} value={objective.id}>
                        {objective.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">{t('pomodoros')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setPomodoros(Math.max(1, pomodoros - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-lg font-medium"
                    >
                      -
                    </button>
                    <span className="flex items-center gap-1.5 text-base font-semibold text-foreground min-w-[4rem] justify-center tabular-nums">
                      {pomodoros} <span className="text-sm">🍅</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPomodoros(Math.min(10, pomodoros + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-lg font-medium"
                    >
                      +
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">({pomodoros * 25}m)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border/40">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-5 font-medium hover:bg-muted"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className="h-10 rounded-xl px-6 text-white font-medium disabled:opacity-50 shadow-md transition-transform active:scale-95" 
                  style={{ backgroundColor: themeColor, boxShadow: `0 4px 14px ${themeColor}30` }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('adding') : t('start')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

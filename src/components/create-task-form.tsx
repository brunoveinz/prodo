'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/actions/tasks'
import { useToast } from '@/components/ui/notification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CreateTaskFormProps {
  objectiveId: string
}

export default function CreateTaskForm({ objectiveId }: CreateTaskFormProps) {
  const [title, setTitle] = useState('')
  const [pomodoros, setPomodoros] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations('Forms.Tasks')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.append('objectiveId', objectiveId)
      await createTask(formData)

      toast({
        title: t('successTitle'),
        description: t('successDetail'),
        variant: 'success',
      })

      setTitle('')
      setPomodoros(1)
      router.refresh()
    } catch (error) {
      toast({
        title: t('errorTitle'),
        description: (error as Error)?.message || t('errorDesc'),
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input type="hidden" name="objectiveId" value={objectiveId} />
      <input type="hidden" name="estimatedPomodoros" value={pomodoros} />
      <Input
        name="title"
        type="text"
        placeholder={t('addPlaceholder')}
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="flex-1"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setPomodoros(Math.max(1, pomodoros - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-sm font-medium"
        >
          -
        </button>
        <span className="flex items-center gap-1 text-sm font-medium text-foreground min-w-[3rem] justify-center tabular-nums">
          {pomodoros} <span className="text-xs text-muted-foreground">🍅</span>
        </span>
        <button
          type="button"
          onClick={() => setPomodoros(Math.min(10, pomodoros + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40 transition-colors text-sm font-medium"
        >
          +
        </button>
      </div>
      <Button type="submit" size="sm" className="shrink-0 w-full sm:w-auto" disabled={isSubmitting}>
        <Plus className="h-4 w-4 mr-1" />
        {isSubmitting ? t('adding') : t('addBtn')}
      </Button>
    </form>
  )
}

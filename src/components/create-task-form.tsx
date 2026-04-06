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
      <Input
        name="title"
        type="text"
        placeholder={t('addPlaceholder')}
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="sm" className="shrink-0 w-full sm:w-auto" disabled={isSubmitting}>
        <Plus className="h-4 w-4 mr-1" />
        {isSubmitting ? t('adding') : t('addBtn')}
      </Button>
    </form>
  )
}

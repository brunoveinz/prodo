'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/actions/tasks'
import { useToast } from '@/components/ui/notification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

interface CreateTaskFormProps {
  objectiveId: string
}

export default function CreateTaskForm({ objectiveId }: CreateTaskFormProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const toast = useToast()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.append('objectiveId', objectiveId)
      await createTask(formData)

      toast({
        title: 'Tarea creada',
        description: 'Tu tarea se agregó al objetivo y está lista para enfocar.',
        variant: 'success',
      })

      setTitle('')
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error al crear tarea',
        description: (error as Error)?.message || 'Intenta nuevamente.',
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
        placeholder="Agregar nueva tarea..."
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="sm" className="shrink-0 w-full sm:w-auto" disabled={isSubmitting}>
        <Plus className="h-4 w-4 mr-1" />
        {isSubmitting ? 'Agregando...' : 'Agregar'}
      </Button>
    </form>
  )
}

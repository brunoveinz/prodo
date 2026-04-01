'use client'

import { useFormStatus } from 'react-dom'
import { createTask } from '@/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface CreateTaskFormProps {
  objectiveId: string
}

export default function CreateTaskForm({ objectiveId }: CreateTaskFormProps) {
  const { pending } = useFormStatus()

  return (
    <Card className="p-6">
      <form action={createTask} className="space-y-4">
        <input type="hidden" name="objectiveId" value={objectiveId} />
        <div>
          <Label htmlFor="title" className="text-sm font-medium">
            Task Title
          </Label>
          <Input
            id="title"
            name="title"
            type="text"
            placeholder="e.g., Implement skin analysis module"
            required
            disabled={pending}
            className="mt-2"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating...' : 'Create Task'}
        </Button>
      </form>
    </Card>
  )
}

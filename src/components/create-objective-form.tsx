'use client'

import { useFormStatus } from 'react-dom'
import { createObjective } from '@/actions/objectives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function CreateObjectiveForm() {
  const { pending } = useFormStatus()

  return (
    <Card className="p-6">
      <form action={createObjective} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Objective Name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., Develop MVP of SKINI"
            required
            disabled={pending}
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="color" className="text-sm font-medium">
            Color
          </Label>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue="#6366f1"
            required
            disabled={pending}
            className="mt-2 h-10 cursor-pointer"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating...' : 'Create Objective'}
        </Button>
      </form>
    </Card>
  )
}

'use server'

import { db } from '@/db'
import { tasks, objectives } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export async function getTasksByObjective(objectiveId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Verify the objective belongs to the user
  const [objective] = await db
    .select()
    .from(objectives)
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, session.user.id)))
    .limit(1)

  if (!objective) {
    throw new Error('Objective not found')
  }

  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.objectiveId, objectiveId))
    .orderBy(tasks.createdAt)
}

export async function createTask(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const objectiveId = formData.get('objectiveId') as string
  const title = formData.get('title') as string

  if (!objectiveId || !title) {
    throw new Error('Objective and title are required')
  }

  // Verify the objective belongs to the user
  const [objective] = await db
    .select()
    .from(objectives)
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, session.user.id)))
    .limit(1)

  if (!objective) {
    throw new Error('Objective not found')
  }

  const [newTask] = await db
    .insert(tasks)
    .values({
      objectiveId,
      title,
      isCompleted: false,
    })
    .returning()

  revalidatePath('/')
  return newTask
}

export async function completeTask(taskId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Get the task and verify ownership through objective
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1)

  if (!task) {
    throw new Error('Task not found')
  }

  const [objective] = await db
    .select()
    .from(objectives)
    .where(and(eq(objectives.id, task.objectiveId), eq(objectives.userId, session.user.id)))
    .limit(1)

  if (!objective) {
    throw new Error('Unauthorized')
  }

  const [updated] = await db
    .update(tasks)
    .set({ isCompleted: !task.isCompleted })
    .where(eq(tasks.id, taskId))
    .returning()

  revalidatePath('/')
  return updated
}

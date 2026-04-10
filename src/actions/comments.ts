'use server'

import { db } from '@/db'
import { taskComments, tasks, objectives } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export async function getTaskComments(taskId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Verify ownership through objective
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

  return await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt))
}

export async function addTaskComment(taskId: string, content: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  if (!content.trim()) {
    throw new Error('Content is required')
  }

  // Verify ownership
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

  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId,
      userId: session.user.id,
      content: content.trim(),
    })
    .returning()

  revalidatePath('/')
  return comment
}

export async function deleteTaskComment(commentId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  await db
    .delete(taskComments)
    .where(
      and(
        eq(taskComments.id, commentId),
        eq(taskComments.userId, session.user.id)
      )
    )

  revalidatePath('/')
}

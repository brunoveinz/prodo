'use server'

import { db } from '@/db'
import { tasks, objectives, dailyPlanItems } from '@/db/schema'
import { eq, and, notInArray, sql } from 'drizzle-orm'
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
  const estimatedPomodoros = parseInt(formData.get('estimatedPomodoros') as string, 10) || 1

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
      estimatedPomodoros,
    })
    .returning()

  revalidatePath('/')
  return newTask
}

export async function getBacklogTasks() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const today = new Date().toISOString().split('T')[0]

  // Get task IDs already in today's plan
  const plannedTaskIds = db
    .select({ taskId: dailyPlanItems.taskId })
    .from(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.userId, session.user.id),
        eq(dailyPlanItems.date, today)
      )
    )

  // Get all non-completed tasks not in today's plan
  const backlog = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      isCompleted: tasks.isCompleted,
      estimatedPomodoros: tasks.estimatedPomodoros,
      objectiveId: objectives.id,
      objectiveName: objectives.name,
      objectiveColor: objectives.color,
    })
    .from(tasks)
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        eq(tasks.isCompleted, false),
        notInArray(tasks.id, plannedTaskIds)
      )
    )
    .orderBy(objectives.name, tasks.createdAt)

  return backlog
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

'use server'

import { db } from '@/db'
import { dailyPlanItems, tasks, objectives } from '@/db/schema'
import { eq, and, sql, max } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export async function getTodaysPlan() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const today = getTodayDate()

  const items = await db
    .select({
      id: dailyPlanItems.id,
      sortOrder: dailyPlanItems.sortOrder,
      taskId: tasks.id,
      taskTitle: tasks.title,
      isCompleted: tasks.isCompleted,
      estimatedPomodoros: tasks.estimatedPomodoros,
      objectiveId: objectives.id,
      objectiveName: objectives.name,
      objectiveColor: objectives.color,
    })
    .from(dailyPlanItems)
    .innerJoin(tasks, eq(dailyPlanItems.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(dailyPlanItems.userId, session.user.id),
        eq(dailyPlanItems.date, today)
      )
    )
    .orderBy(dailyPlanItems.sortOrder)

  return items
}

export async function addTaskToPlan(taskId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Verify task ownership through objective
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

  const today = getTodayDate()

  // Get current max sortOrder
  const [maxOrder] = await db
    .select({ maxSort: max(dailyPlanItems.sortOrder) })
    .from(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.userId, session.user.id),
        eq(dailyPlanItems.date, today)
      )
    )

  const nextOrder = (maxOrder?.maxSort ?? -1) + 1

  // Insert with ON CONFLICT DO NOTHING for idempotency
  await db
    .insert(dailyPlanItems)
    .values({
      userId: session.user.id,
      taskId,
      date: today,
      sortOrder: nextOrder,
    })
    .onConflictDoNothing()

  revalidatePath('/')
}

export async function removeTaskFromPlan(planItemId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  await db
    .delete(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.id, planItemId),
        eq(dailyPlanItems.userId, session.user.id)
      )
    )

  revalidatePath('/')
}

export async function reorderPlanItems(orderedIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Update each item's sortOrder based on its position in the array
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(dailyPlanItems)
        .set({ sortOrder: index })
        .where(
          and(
            eq(dailyPlanItems.id, id),
            eq(dailyPlanItems.userId, session.user.id)
          )
        )
    )
  )

  revalidatePath('/')
}

export async function createTaskAndAddToPlan(title: string, objectiveId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  if (!title.trim()) {
    throw new Error('Title is required')
  }

  // Verify objective ownership
  const [objective] = await db
    .select()
    .from(objectives)
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, session.user.id)))
    .limit(1)

  if (!objective) {
    throw new Error('Objective not found')
  }

  // Create the task
  const [newTask] = await db
    .insert(tasks)
    .values({
      objectiveId,
      title: title.trim(),
      isCompleted: false,
    })
    .returning()

  const today = getTodayDate()

  // Get current max sortOrder
  const [maxOrder] = await db
    .select({ maxSort: max(dailyPlanItems.sortOrder) })
    .from(dailyPlanItems)
    .where(
      and(
        eq(dailyPlanItems.userId, session.user.id),
        eq(dailyPlanItems.date, today)
      )
    )

  const nextOrder = (maxOrder?.maxSort ?? -1) + 1

  // Add to today's plan
  await db
    .insert(dailyPlanItems)
    .values({
      userId: session.user.id,
      taskId: newTask.id,
      date: today,
      sortOrder: nextOrder,
    })

  revalidatePath('/')
  return newTask
}

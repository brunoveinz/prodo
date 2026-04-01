'use server'

import { db } from '@/db'
import { distractions, pomodoroSessions, tasks, objectives } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function logDistraction(
  sessionId: string,
  type: 'internal' | 'external',
  note?: string
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Verify session belongs to the user
  const [pomSession] = await db
    .select()
    .from(pomodoroSessions)
    .where(eq(pomodoroSessions.id, sessionId))
    .limit(1)

  if (!pomSession) {
    throw new Error('Session not found')
  }

  // Verify task ownership
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, pomSession.taskId))
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

  const [newDistraction] = await db
    .insert(distractions)
    .values({
      sessionId,
      type,
      note,
      timestamp: new Date(),
    })
    .returning()

  return newDistraction
}

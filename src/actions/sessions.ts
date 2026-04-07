'use server'

import { db } from '@/db'
import { pomodoroSessions, distractions, tasks, objectives } from '@/db/schema'
import { eq, and, gte, lt, count, sql, sum } from 'drizzle-orm'
import { refresh } from 'next/cache'
import { auth } from '@/lib/auth'

export async function createPomodoroSession(data: {
  taskId: string
  durationMinutes: number
  status: 'completed' | 'aborted'
  startedAt: Date
  endedAt?: Date
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // Verify task ownership
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, data.taskId))
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

  const [newSession] = await db
    .insert(pomodoroSessions)
    .values({
      taskId: data.taskId,
      durationMinutes: data.durationMinutes,
      status: data.status,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
    })
    .returning()

  refresh()
  return newSession
}

export async function getDashboardData(days: 7 | 30 = 7) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // 1. Hours per day
  const dailyHours = await db
    .select({
      date: sql<string>`DATE(${pomodoroSessions.startedAt})`,
      hours: sql<number>`SUM(${pomodoroSessions.durationMinutes}) / 60.0`,
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        gte(pomodoroSessions.startedAt, since),
        eq(pomodoroSessions.status, 'completed')
      )
    )
    .groupBy(sql`DATE(${pomodoroSessions.startedAt})`)

  // 2. Time distribution by objective
  const objectiveBreakdown = await db
    .select({
      objectiveId: objectives.id,
      name: objectives.name,
      color: objectives.color,
      hours: sql<number>`SUM(${pomodoroSessions.durationMinutes}) / 60.0`,
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        gte(pomodoroSessions.startedAt, since),
        eq(pomodoroSessions.status, 'completed')
      )
    )
    .groupBy(objectives.id, objectives.name, objectives.color)

  // 3. Average distractions per session
  const sessionsWithDistractionsCount = await db
    .select({
      sessionId: pomodoroSessions.id,
      distractionCount: count(distractions.id),
    })
    .from(pomodoroSessions)
    .leftJoin(distractions, eq(pomodoroSessions.id, distractions.sessionId))
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        gte(pomodoroSessions.startedAt, since),
        eq(pomodoroSessions.status, 'completed')
      )
    )
    .groupBy(pomodoroSessions.id)

  const avgDistractions =
    sessionsWithDistractionsCount.length > 0
      ? sessionsWithDistractionsCount.reduce((sum, item) => sum + item.distractionCount, 0) /
        sessionsWithDistractionsCount.length
      : 0

  return {
    dailyHours: dailyHours.map((item) => ({
      date: item.date,
      hours: Number(Number(item.hours ?? 0).toFixed(2)),
    })),
    objectiveBreakdown: objectiveBreakdown.map((item) => ({
      name: item.name,
      color: item.color,
      hours: Number(Number(item.hours ?? 0).toFixed(2)),
    })),
    avgDistractions: Number(avgDistractions.toFixed(1)),
  }
}

export async function getCalendarData(year: number, month: number) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  // month is 1-indexed (1=Jan)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  const data = await db
    .select({
      date: sql<string>`DATE(${pomodoroSessions.startedAt})`,
      sessionCount: count(pomodoroSessions.id),
      hours: sql<number>`SUM(${pomodoroSessions.durationMinutes}) / 60.0`,
      objectiveColors: sql<string[]>`ARRAY_AGG(DISTINCT ${objectives.color})`,
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        eq(pomodoroSessions.status, 'completed'),
        gte(pomodoroSessions.startedAt, startDate),
        lt(pomodoroSessions.startedAt, endDate)
      )
    )
    .groupBy(sql`DATE(${pomodoroSessions.startedAt})`)

  return data.map((item) => ({
    date: item.date,
    sessionCount: Number(item.sessionCount),
    hours: Number(Number(item.hours).toFixed(2)),
    objectiveColors: item.objectiveColors || [],
  }))
}

export async function getDayDetail(dateStr: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const dayStart = new Date(dateStr + 'T00:00:00')
  const dayEnd = new Date(dateStr + 'T23:59:59.999')

  const data = await db
    .select({
      taskTitle: tasks.title,
      objectiveName: objectives.name,
      objectiveColor: objectives.color,
      sessionCount: count(pomodoroSessions.id),
      totalMinutes: sql<number>`SUM(${pomodoroSessions.durationMinutes})`.as('totalMinutes'),
      distractionCount: sql<number>`COUNT(DISTINCT ${distractions.id})`.as('distractionCount'),
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
    .leftJoin(distractions, eq(distractions.sessionId, pomodoroSessions.id))
    .where(
      and(
        eq(objectives.userId, session.user.id),
        eq(pomodoroSessions.status, 'completed'),
        gte(pomodoroSessions.startedAt, dayStart),
        lt(pomodoroSessions.startedAt, dayEnd)
      )
    )
    .groupBy(tasks.id, tasks.title, objectives.name, objectives.color)

  return data.map((item) => ({
    taskTitle: item.taskTitle,
    objectiveName: item.objectiveName,
    objectiveColor: item.objectiveColor,
    sessionCount: Number(item.sessionCount),
    totalMinutes: Number(item.totalMinutes),
    distractionCount: Number(item.distractionCount),
  }))
}

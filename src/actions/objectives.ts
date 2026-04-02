'use server'

import { db } from '@/db'
import { objectives } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export async function getObjectives() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  return await db
    .select()
    .from(objectives)
    .where(and(eq(objectives.userId, session.user.id), eq(objectives.status, 'active')))
    .orderBy(objectives.createdAt)
}

export async function createObjective(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const name = formData.get('name') as string
  const color = formData.get('color') as string

  if (!name || !color) {
    throw new Error('Name and color are required')
  }

  const [newObjective] = await db
    .insert(objectives)
    .values({
      userId: session.user.id,
      name,
      color,
      status: 'active',
    })
    .returning()

  revalidatePath('/')
}

export async function updateObjectiveStatus(
  objectiveId: string,
  status: 'active' | 'completed' | 'paused'
) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }

  const [updated] = await db
    .update(objectives)
    .set({ status })
    .where(and(eq(objectives.id, objectiveId), eq(objectives.userId, session.user.id)))
    .returning()

  revalidatePath('/')
  return updated
}

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

declare global {
  var __prodo_sql_client: ReturnType<typeof postgres> | undefined
  var __prodo_db: ReturnType<typeof drizzle> | undefined
}

const sqlClient = globalThis.__prodo_sql_client ?? postgres(process.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 30,
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prodo_sql_client = sqlClient
}

export const db = globalThis.__prodo_db ?? drizzle(sqlClient, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prodo_db = db
}

import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  index,
  date,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Auth.js required tables
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text(),
  email: text().notNull().unique(),
  emailVerified: timestamp({ mode: 'date' }),
  image: text(),
  password: text(), // for Credentials provider
})

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (account) => ({
    compoundKey: { primary: true, columns: [account.provider, account.providerAccountId] },
  })
)

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp({ mode: 'date' }).notNull(),
  },
  (session) => ({
    userIdIdx: index('sessions_user_id_idx').on(session.userId),
  })
)

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: { primary: true, columns: [vt.identifier, vt.token] },
  })
)

// App tables
export const objectives = pgTable(
  'objectives',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    color: text().notNull().default('#6366f1'),
    status: text().$type<'active' | 'completed' | 'paused'>().notNull().default('active'),
    createdAt: timestamp({ mode: 'date' }).defaultNow(),
  },
  (objective) => ({
    userIdIdx: index('objectives_user_id_idx').on(objective.userId),
  })
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    objectiveId: uuid()
      .notNull()
      .references(() => objectives.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    isCompleted: boolean().notNull().default(false),
    estimatedPomodoros: integer().notNull().default(1),
    createdAt: timestamp({ mode: 'date' }).defaultNow(),
  },
  (task) => ({
    objectiveIdIdx: index('tasks_objective_id_idx').on(task.objectiveId),
  })
)

export const pomodoroSessions = pgTable(
  'pomodoro_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    durationMinutes: integer().notNull(),
    status: text().$type<'completed' | 'aborted'>().notNull(),
    startedAt: timestamp({ mode: 'date' }).notNull(),
    endedAt: timestamp({ mode: 'date' }),
  },
  (session) => ({
    taskIdIdx: index('pomodoro_sessions_task_id_idx').on(session.taskId),
  })
)

export const distractions = pgTable(
  'distractions',
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => pomodoroSessions.id, { onDelete: 'cascade' }),
    type: text().$type<'internal' | 'external'>().notNull(),
    note: text(),
    timestamp: timestamp({ mode: 'date' }).defaultNow(),
  },
  (distraction) => ({
    sessionIdIdx: index('distractions_session_id_idx').on(distraction.sessionId),
  })
)

// Daily plan items - tasks planned for a specific day
export const dailyPlanItems = pgTable(
  'daily_plan_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ mode: 'date' }).defaultNow(),
  },
  (item) => ({
    userDateIdx: index('daily_plan_user_date_idx').on(item.userId, item.date),
    uniqueTaskDate: unique().on(item.taskId, item.date),
  })
)

// Task comments
export const taskComments = pgTable(
  'task_comments',
  {
    id: uuid().primaryKey().defaultRandom(),
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text().notNull(),
    createdAt: timestamp({ mode: 'date' }).defaultNow(),
  },
  (comment) => ({
    taskIdIdx: index('task_comments_task_id_idx').on(comment.taskId),
  })
)

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  objectives: many(objectives),
  accounts: many(accounts),
  sessions: many(sessions),
  dailyPlanItems: many(dailyPlanItems),
}))

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  user: one(users, {
    fields: [objectives.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [tasks.objectiveId],
    references: [objectives.id],
  }),
  pomodoroSessions: many(pomodoroSessions),
  dailyPlanItems: many(dailyPlanItems),
  comments: many(taskComments),
}))

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}))

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one, many }) => ({
  task: one(tasks, {
    fields: [pomodoroSessions.taskId],
    references: [tasks.id],
  }),
  distractions: many(distractions),
}))

export const distractionsRelations = relations(distractions, ({ one }) => ({
  pomodoroSession: one(pomodoroSessions, {
    fields: [distractions.sessionId],
    references: [pomodoroSessions.id],
  }),
}))

export const dailyPlanItemsRelations = relations(dailyPlanItems, ({ one }) => ({
  user: one(users, {
    fields: [dailyPlanItems.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [dailyPlanItems.taskId],
    references: [tasks.id],
  }),
}))

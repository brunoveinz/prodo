import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import {
  users,
  objectives,
  tasks,
  pomodoroSessions,
  distractions,
  dailyPlanItems,
} from '@/db/schema'

// User types
export type User = InferSelectModel<typeof users>
export type UserInsert = InferInsertModel<typeof users>

// Objective types
export type Objective = InferSelectModel<typeof objectives>
export type ObjectiveInsert = InferInsertModel<typeof objectives>
export type ObjectiveStatus = 'active' | 'completed' | 'paused'

// Task types
export type Task = InferSelectModel<typeof tasks>
export type TaskInsert = InferInsertModel<typeof tasks>

// Pomodoro Session types
export type PomodoroSession = InferSelectModel<typeof pomodoroSessions>
export type PomodorSessionInsert = InferInsertModel<typeof pomodoroSessions>
export type SessionStatus = 'completed' | 'aborted'

// Distraction types
export type Distraction = InferSelectModel<typeof distractions>
export type DistractionInsert = InferInsertModel<typeof distractions>
export type DistractionType = 'internal' | 'external'

// Daily Plan Item types
export type DailyPlanItem = InferSelectModel<typeof dailyPlanItems>
export type DailyPlanItemInsert = InferInsertModel<typeof dailyPlanItems>

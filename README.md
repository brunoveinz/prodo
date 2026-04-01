# FocusTracker Pro

A Pomodoro-based productivity tracker with long-term analytics, built on Next.js 16, React 19, and PostgreSQL.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)
- PostgreSQL client (optional, for direct DB access)

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your PostgreSQL credentials (or use the defaults)
   ```

3. **Start PostgreSQL:**
   ```bash
   docker compose up -d
   ```

4. **Initialize database:**
   ```bash
   npm run db:push
   ```

5. **Start dev server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Core Functionality
- **Macro Objectives** — Long-term goals with color coding
- **Tasks** — Actionable items within objectives
- **Pomodoro Sessions** — 5/25/50/90-minute focused work blocks
- **Distraction Logging** — One-click or spacebar to log distractions without interrupting the timer
- **Resilient Timer** — Continues accurately even if you switch tabs or the browser goes to sleep

### Analytics Dashboard
- **Productive Hours** — Bar chart showing hours/day over 7 or 30 days
- **Time by Objective** — Pie chart showing effort distribution
- **Focus Quality Metric** — Average distractions per session

## Architecture

### Tech Stack
- **Frontend:** Next.js 16.2.2 (App Router), React 19, Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Database:** PostgreSQL, Drizzle ORM with migrations
- **Authentication:** Auth.js v5 (email/password with JWT)
- **Charts:** Recharts

### Key Design Decisions

#### Timer Resilience
The timer doesn't rely on JavaScript's `setInterval` count. Instead:
- On start, the current time is stored in `localStorage`
- The interval (500ms) always calculates elapsed time as `Date.now() - storedStart`
- This works across tab switches, page reloads, and browser sleep

#### Server/Client Boundaries
- **Server Components:** Pages, selectors, read-only data fetching
- **Client Components:** Forms (`useFormStatus`), timer (`useResilientTimer`), charts, interactive elements
- **Server Actions:** All mutations use `'use server'` with `revalidatePath()` for cache invalidation

#### Distraction Buffering
- During a session, distractions are buffered locally as `{type, note, timestamp}[]`
- After the session is created and returns an ID, distractions are flushed to the database
- This avoids needing to know the session ID before logging occurs

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── api/auth/        # Auth.js route handlers
│   ├── dashboard/       # Analytics page
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main app (objectives → tasks → timer)
├── actions/             # Server Actions for mutations
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Chart and metric components
│   └── ...              # App components
├── db/
│   ├── schema.ts        # Drizzle schema
│   ├── migrations/      # SQL migrations
│   └── index.ts         # Drizzle client
├── hooks/               # Custom hooks (useResilientTimer, useSession)
├── lib/                 # Auth config, types, utilities
└── middleware.ts        # Auth middleware for protected routes
```

## Available Scripts

```bash
npm run dev              # Start dev server (Turbopack by default)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

npm run db:generate     # Generate SQL migration
npm run db:push         # Apply migrations
npm run db:migrate      # Run pending migrations
npm run db:studio       # Open Drizzle Studio GUI
```

## Database

### Schema Overview
- **users** — User accounts with email + hashed password
- **objectives** — Macro goals (name, color, status)
- **tasks** — Tasks within an objective (title, isCompleted)
- **pomodoro_sessions** — Timer records (duration, status, startedAt, endedAt)
- **distractions** — Distraction logs (type: internal|external, note, timestamp)
- **accounts, sessions, verificationTokens** — Auth.js required tables

### Viewing Data
```bash
npm run db:studio
```

Open the GUI to explore and edit data directly.

## Authentication

### Registration
1. Navigate to `/register`
2. Enter name, email, password (8+ characters)
3. Auto-login and redirect to main app

### Login
1. Navigate to `/login`
2. Enter email and password
3. Redirect to main app

### Logout
Click the Logout button in the header. Session is cleared via Auth.js.

## Usage

### Creating a Session

1. Select or create a **Macro Objective** (with color)
2. Select or create a **Task** within that objective
3. Choose session duration (5/25/50/90 minutes)
4. Click "Start Session"
5. Timer runs, accurately tracking elapsed time
6. Press spacebar or click "Log Distraction" to record interruptions
7. Timer completes → session saved with all distractions

### Viewing Analytics

1. Click "Dashboard" in the header (or go to `/dashboard`)
2. View charts for the last 7 or 30 days
3. See total productive hours, effort by objective, and focus quality

## Deployment

### Vercel

1. Push code to GitHub
2. Create a new project on Vercel, import the repo
3. Add environment variables:
   ```
   DATABASE_URL=<Vercel Postgres connection string>
   AUTH_SECRET=<openssl rand -base64 32>
   AUTH_URL=<https://your-app.vercel.app>
   ```
4. Deploy → Vercel runs `npm run build` and starts the app

## Notes

- **React Compiler:** Enabled globally. Do not use manual `useMemo`/`useCallback`.
- **Tailwind v4:** No `tailwind.config.js` file. Configuration is in `globals.css` with `@import "tailwindcss"`.
- **Next.js 16:** `searchParams` is a Promise; always `await` before destructuring in Server Components.
- **No linting on build:** Run `npm run lint` explicitly before committing.

## Future Enhancements

- OAuth (Google, GitHub) sign-in
- Team/shared projects
- Real-time timer sync across devices
- Goal breakdown and sprint planning
- Export/import of sessions
- Dark mode refinement

## License

MIT

# Product Requirements Document (PRD)
## Project Name: Prodo (FocusTracker Pro)

### 1. Project Vision
Create a productivity tool based on the Pomodoro technique, optimized for long-term performance analysis. The application links each time block to macro objectives and actively logs distractions to generate daily and monthly productivity metrics, allowing users to identify time leaks in real-world projects.

### 2. Tech Stack and Architecture
* **Frontend/Backend:** Next.js (App Router) with React Compiler enabled.
* **Styling:** Tailwind CSS + shadcn/ui.
* **Authentication:** NextAuth.js or Clerk (Support for Email/Password and Google/GitHub login).
* **Database (Local):** PostgreSQL running in a Docker container.
* **Database (Production):** Vercel Postgres (Free Tier).
* **ORM:** Drizzle ORM (for agnostic DB management via `DATABASE_URL`).
* **Deployment:** Vercel (Hobby Tier).

### 3. Core Use Cases & Main Flow
1. **Authentication:** User logs in to access their private workspace.
2. **Planning:** User selects a **Macro Objective** (e.g., "SKINI MVP" or "Nebula Space Runner") and defines a task.
3. **Focus:** Starts a Pomodoro. If there is an interruption, they log the **Distraction** with a single click/hotkey without breaking their flow.
4. **Completion:** Upon finishing, the session is saved and linked to the user and the task.
5. **Analytics:** User reviews their monthly productivity dashboard to adjust their habits.

### 4. Entities and Data Model (Multi-tenant)

All tables include a `user_id: string` to ensure data isolation.

* **Macro Objectives (Projects/Epics):** `id`, `user_id`, `name`, `color`, `status`, `created_at`.
* **Tasks:** `id`, `user_id`, `objective_id`, `title`, `is_completed`, `created_at`.
* **Sessions (Pomodoros):** `id`, `user_id`, `task_id`, `duration_minutes`, `status` (completed/aborted), `started_at`, `ended_at`.
* **Distractions (Logs):** `id`, `user_id`, `session_id`, `type` (internal/external), `note`, `timestamp`.

### 5. Key Features
* **Resilient Timer:** Calculations based on timestamp differences to prevent drift or desyncs when changing tabs.
* **Zero-Friction Logging:** Dedicated hotkey/button to instantly mark distractions.
* **Analytics Dashboard:** 
    * Productive hours per day (last 30 days).
    * Time distribution per Macro Objective.
    * Distraction ratio per session.

### 6. Constraints and Optimizations
* **Zero Cost (Production):** Cloud architecture must remain strictly within free-tier limits (Vercel and Vercel Postgres).
* **Zero Cost (Development):** The development environment uses Docker to run PostgreSQL locally. This is 100% free (utilizes local hardware) and avoids consuming the production database's monthly quota during the programming and testing phase.
* **Component Isolation:** The timer must be an isolated Client Component to optimize re-renders via the React Compiler.
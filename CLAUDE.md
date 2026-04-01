# Product Requirements Document (PRD)
## Nombre del Proyecto: FocusTracker Pro (Pomodoro Vitaminado)

### 1. Visión del Proyecto
Crear una herramienta de productividad basada en la técnica Pomodoro, optimizada para el análisis de rendimiento a largo plazo. La aplicación vincula cada bloque de tiempo a metas macro y registra activamente distracciones para generar métricas de productividad diaria y mensual, permitiendo identificar fugas de tiempo en proyectos reales.

### 2. Stack Tecnológico y Arquitectura
* **Frontend/Backend:** Next.js (App Router) con React Compiler habilitado.
* **Estilos:** Tailwind CSS + shadcn/ui.
* **Autenticación:** NextAuth.js o Clerk (Soporte para Login con Email/Password y Google/GitHub).
* **Base de Datos (Local):** PostgreSQL en contenedor Docker.
* **Base de Datos (Producción):** Vercel Postgres (Capa gratuita).
* **ORM:** Drizzle ORM (para manejo agnóstico de la DB mediante `DATABASE_URL`).
* **Despliegue:** Vercel (Hobby Tier).

### 3. Casos de Uso y Flujo Principal
1.  **Autenticación:** El usuario inicia sesión para acceder a su entorno privado.
2.  **Planificación:** El usuario selecciona un **Objetivo Macro** (ej: "MVP de SKINI" o "Nebula Space Runner") y define una tarea.
3.  **Enfoque:** Inicia un Pomodoro. Si hay una interrupción, registra la **Distracción** con un solo click/hotkey sin detener el flujo.
4.  **Cierre:** Al terminar, la sesión se guarda vinculada al usuario y a la tarea.
5.  **Análisis:** El usuario revisa su dashboard de productividad mensual para ajustar sus hábitos.

### 4. Entidades y Modelo de Datos (Multi-usuario)

Todas las tablas incluyen `user_id: UUID` para garantizar el aislamiento de datos.

* **Objetivos Macro (Projects/Epics):** `id`, `user_id`, `name`, `color`, `status`, `created_at`.
* **Tareas (Tasks):** `id`, `user_id`, `objective_id`, `title`, `is_completed`, `created_at`.
* **Sesiones (Pomodoros):** `id`, `user_id`, `task_id`, `duration_minutes`, `status` (completed/aborted), `started_at`, `ended_at`.
* **Distracciones (Logs):** `id`, `user_id`, `session_id`, `type` (internal/external), `note`, `timestamp`.

### 5. Características Clave
* **Temporizador Resiliente:** Cálculo basado en diferencia de timestamps para evitar desfases al cambiar de pestaña.
* **Registro de Fricción Cero:** Botón dedicado para marcar distracciones instantáneamente.
* **Dashboard de Analíticas:** * Horas productivas por día (últimos 30 días).
    * Distribución de tiempo por Objetivo Macro.
    * Ratio de distracciones por sesión.

### 6. Restricciones y Optimizaciones
* **Costo Cero (Producción):** La arquitectura en la nube debe mantenerse estrictamente dentro de los límites de las capas gratuitas (Vercel y Vercel Postgres).
* **Costo Cero (Desarrollo):** El entorno de desarrollo utilizará Docker para correr PostgreSQL localmente. Esto es 100% gratuito (utiliza hardware local) y evita consumir la cuota mensual de la base de datos de producción durante la fase de programación y pruebas.
* **Aislamiento de Componentes:** El temporizador debe ser un Client Component aislado para optimizar los re-renders gracias al React Compiler.
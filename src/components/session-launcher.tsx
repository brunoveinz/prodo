'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/notification'
import { Play, CheckCircle, XCircle, Clock, Coffee, SkipForward } from 'lucide-react'
import PomodoroTimer from './pomodoro-timer'
import DotGrid from './dot-grid'
import Confetti from './confetti'
import { completeTask } from '@/actions/tasks'
import { useTranslations } from 'next-intl'

const SHORT_BREAK_MINUTES = 5
const LONG_BREAK_MINUTES = 15
const LONG_BREAK_EVERY = 4

const RING_RADIUS = 120
const RING_STROKE = 8
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2

type UpcomingTask = {
  taskTitle: string
  objectiveColor: string
}

interface SessionLauncherProps {
  taskId: string
  objectiveId: string
  taskTitle?: string
  defaultDuration?: number
  themeColor?: string
  upcomingTasks?: UpcomingTask[]
}

type SessionState = 'idle' | 'running' | 'break' | 'completed' | 'aborted'

export default function SessionLauncher({
  taskId,
  objectiveId,
  taskTitle,
  defaultDuration = 25,
  themeColor = '#3b82f6',
  upcomingTasks = [],
}: SessionLauncherProps) {
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [showConfetti, setShowConfetti] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [breakRemainingMs, setBreakRemainingMs] = useState(0)
  const [breakIsRunning, setBreakIsRunning] = useState(false)
  const durationMinutes = '25'
  const toast = useToast()
  const router = useRouter()
  const t = useTranslations('Session.Launcher')
  const jt = useTranslations('Jornada')

  // Break timer logic
  const isLongBreak = completedPomodoros > 0 && completedPomodoros % LONG_BREAK_EVERY === 0
  const breakDurationMinutes = isLongBreak ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES

  const startBreakTimer = useCallback(() => {
    const breakMs = breakDurationMinutes * 60 * 1000
    localStorage.setItem('prodo_break_start', Date.now().toString())
    localStorage.setItem('prodo_break_duration', breakMs.toString())
    setBreakRemainingMs(breakMs)
    setBreakIsRunning(true)
  }, [breakDurationMinutes])

  const stopBreakTimer = useCallback(() => {
    localStorage.removeItem('prodo_break_start')
    localStorage.removeItem('prodo_break_duration')
    setBreakIsRunning(false)
    setBreakRemainingMs(0)
  }, [])

  // Break timer tick
  useEffect(() => {
    if (!breakIsRunning) return
    const interval = setInterval(() => {
      const s = localStorage.getItem('prodo_break_start')
      const d = localStorage.getItem('prodo_break_duration')
      if (!s || !d) { setBreakIsRunning(false); return }
      const rem = Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
      setBreakRemainingMs(rem)
      if (rem <= 0) {
        stopBreakTimer()
        setSessionState('completed')
        toast({ title: t('breakEnded'), description: t('readyForNext'), variant: 'info' })
      }
    }, 100)
    return () => clearInterval(interval)
  }, [breakIsRunning, stopBreakTimer, toast])

  // Resume break on reload
  useEffect(() => {
    const s = localStorage.getItem('prodo_break_start')
    const d = localStorage.getItem('prodo_break_duration')
    if (s && d) {
      const rem = Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
      if (rem > 0) {
        setBreakRemainingMs(rem)
        setBreakIsRunning(true)
        setSessionState('break')
      } else {
        stopBreakTimer()
      }
    }
  }, [stopBreakTimer])

  async function handleTaskDone() {
    // Mark task as completed
    await completeTask(taskId)

    // Show confetti
    setShowConfetti(true)

    toast({
      title: t('taskCompleted'),
      description: t('excellentWork'),
      variant: 'success',
    })

    // After confetti, start a break
    setTimeout(() => {
      clearActiveSession()
      // Stop the timer localStorage
      localStorage.removeItem('focustracker_session_start')
      localStorage.removeItem('focustracker_duration_ms')

      const isLongBreakNext = (completedPomodoros + 1) > 0 && (completedPomodoros + 1) % LONG_BREAK_EVERY === 0

      setCompletedPomodoros((c) => c + 1)
      setSessionState('break')
      startBreakTimer()
      toast({ title: isLongBreakNext ? t('longBreak') : t('shortBreak'), variant: 'info' })
    }, 2000)
  }

  // Resume session on reload if timer is still running
  useEffect(() => {
    const storedStart = localStorage.getItem('focustracker_session_start')
    const storedDuration = localStorage.getItem('focustracker_duration_ms')
    const storedSession = localStorage.getItem('prodo_active_session')
    if (storedStart && storedDuration && storedSession) {
      const elapsed = Date.now() - parseInt(storedStart, 10)
      const duration = parseInt(storedDuration, 10)
      if (elapsed < duration) {
        setSessionState('running')
      }
    }
  }, [])

  function saveActiveSession() {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
      'prodo_active_session',
      JSON.stringify({
        taskId,
        objectiveId,
        taskTitle,
        durationMinutes,
        route: `/?objective=${objectiveId}&task=${taskId}&duration=${durationMinutes}`,
      })
    )
  }

  function clearActiveSession() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem('prodo_active_session')
  }

  if (sessionState === 'running') {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] text-foreground animate-in fade-in zoom-in-[0.98] duration-500 overflow-y-auto overflow-x-hidden">
        {/* Fixed background and decorations */}
        <div className="fixed inset-0 pointer-events-none">
          <DotGrid color={themeColor} />
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${themeColor}15 0%, transparent 70%)` }} />
        </div>

        {/* Date & time — top right (hidden on very small screens to save space) */}
        <div className="hidden sm:block pointer-events-none">
          <LiveClock />
        </div>

        {/* Upcoming tasks — bottom right */}
        {upcomingTasks.length > 0 && (
          <div className="fixed bottom-6 right-6 z-10 max-w-[220px] space-y-1.5 hidden sm:block pointer-events-none">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{jt('nextQueue')}</p>
            {upcomingTasks.slice(0, 4).map((tr, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tr.objectiveColor }} />
                <span className="text-xs text-white/50 truncate">{tr.taskTitle}</span>
              </div>
            ))}
          </div>
        )}

        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Confetti color={themeColor} />
          </div>
        )}

        {/* Scrollable Center Content */}
        <div className="relative z-20 min-h-full w-full flex flex-col items-center justify-center p-4 py-12 sm:p-8">
          <div className="w-full max-w-sm mx-auto">
            <PomodoroTimer
              taskId={taskId}
              taskTitle={taskTitle}
              durationMinutes={parseInt(durationMinutes)}
              themeColor={themeColor}
              onTaskDone={handleTaskDone}
              onSessionEnd={(status) => {
                clearActiveSession()
                if (status === 'completed') {
                  setCompletedPomodoros((c) => c + 1)
                  setSessionState('break')
                  startBreakTimer()
                  toast({ title: isLongBreak ? t('longBreak') : t('shortBreak'), variant: 'info' })
                } else {
                  setSessionState('aborted')
                }
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (sessionState === 'break') {
    const breakTotalMs = breakDurationMinutes * 60 * 1000
    const breakProgress = breakTotalMs > 0 ? breakRemainingMs / breakTotalMs : 0
    const breakDashOffset = RING_CIRCUMFERENCE * (1 - breakProgress)
    const breakMin = String(Math.floor(breakRemainingMs / 60000)).padStart(2, '0')
    const breakSec = String(Math.floor((breakRemainingMs % 60000) / 1000)).padStart(2, '0')

    return (
      <div className="fixed inset-0 z-50 bg-[#0c1220] text-foreground animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/3 w-[50vw] h-[50vh] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[40vw] h-[40vh] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>

        <div className="hidden sm:block pointer-events-none">
          <LiveClock />
        </div>

        <div className="relative z-20 min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-blue-500/10 ring-1 ring-blue-500/20 mb-6 sm:mb-8">
            <Coffee className="h-7 w-7 sm:h-9 sm:w-9 text-blue-400" />
          </div>
          <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white/90">{jt('breakTitle')}</h3>
            <p className="text-xs sm:text-sm text-blue-200/50">
              {isLongBreak ? jt('breakLong') : jt('breakShort')}
            </p>
          </div>

          <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[256px] mx-auto flex items-center justify-center mb-6 sm:mb-8">
            <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={3} className="stroke-blue-500/10" />
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={breakDashOffset} className="transition-[stroke-dashoffset] duration-1000 ease-linear stroke-blue-400/60" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-5xl sm:text-6xl font-mono font-medium tracking-tight text-blue-100/80 tabular-nums">{breakMin}:{breakSec}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              stopBreakTimer()
              setSessionState('completed')
            }}
            variant="ghost"
            size="sm"
            className="text-xs text-blue-300/40 hover:text-blue-200 hover:bg-blue-500/10 gap-1.5 rounded-lg"
          >
            <SkipForward className="size-3" />
            {jt('skipBreak')}
          </Button>
        </div>
      </div>
    )
  }

  if (sessionState === 'completed') {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          {taskTitle && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground/80">
              {taskTitle}
            </span>
          )}
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-foreground">
              {t('sessionComplete')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('finishedSession', { duration: durationMinutes })}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted px-5 py-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {t('minutesOfFocus', { duration: durationMinutes })}
            </span>
          </div>
          <Button
            onClick={() => setSessionState('idle')}
            className="w-full max-w-xs"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('startAnother')}
          </Button>
        </div>
      </Card>
    )
  }

  if (sessionState === 'aborted') {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          {taskTitle && (
            <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground/80">
              {taskTitle}
            </span>
          )}
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-foreground">
              {t('endedEarly')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('noWorries')}
            </p>
          </div>
          <Button
            onClick={() => setSessionState('idle')}
            variant="secondary"
            className="w-full max-w-xs"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('tryAgain')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/30 bg-background/50 backdrop-blur-2xl shadow-2xl p-8 sm:p-12 transition-all duration-500">
      {/* Background abstract gradients */}
      <div className="pointer-events-none absolute -inset-px opacity-30 mix-blend-screen transition-opacity duration-1000">
        <div className="absolute top-0 left-1/4 w-[40%] h-32 bg-primary/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[30%] h-32 bg-emerald-500/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/30 ring-1 ring-border/50 shadow-inner">
          <Clock className="h-7 w-7 text-primary animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
        
        <div className="space-y-3 max-w-lg">
          {taskTitle && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 mb-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
              <span className="text-xs font-semibold text-foreground tracking-wide">{taskTitle}</span>
            </div>
          )}
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('enterZone')}
          </h3>
          <p className="text-[15px] font-medium text-muted-foreground">
            {t('nextCycleReady')}
          </p>
        </div>

        <Button
          onClick={() => {
            saveActiveSession()
            setSessionState('running')
            toast({
              title: t('deepWorkActivated'),
              description: t('immersiveStarted'),
              variant: 'info',
            })
          }}
          size="lg"
          className="relative overflow-hidden w-full max-w-[280px] h-14 rounded-2xl text-[15px] font-bold shadow-xl transition-all hover:scale-[1.02] mt-6"
          style={{ backgroundColor: themeColor, color: '#fff', boxShadow: `0 0 20px ${themeColor}40` }}
        >
          <div className="absolute inset-0 bg-white/20 hover:bg-white/30 transition-colors" />
          <Play className="h-5 w-5 mr-3 fill-current" />
          {t('startPomodoro')}
        </Button>

        <p className="text-xs text-muted-foreground/80 flex items-center justify-center gap-2 animate-in fade-in delay-200">
          {t('pressSpace').split('Space')[0]}<kbd className="inline-flex items-center rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground shadow-sm">Space</kbd>{t('pressSpace').split('Space')[1]}
        </p>
      </div>
    </div>
  )
}

function LiveClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const date = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="absolute top-6 right-6 z-10 text-right">
      <p className="text-sm font-mono font-medium text-white/60 tabular-nums">{time}</p>
      <p className="text-[11px] text-white/30 capitalize">{date}</p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/notification'
import {
  Play, Square, Zap, AlertTriangle, Coffee,
  SkipForward, CheckCircle2, Pause, Rocket, Check, Trophy, GripVertical
} from 'lucide-react'
import DotGrid from './dot-grid'
import Confetti from './confetti'
import { createPomodoroSession } from '@/actions/sessions'
import { logDistraction } from '@/actions/distractions'
import { completeTask } from '@/actions/tasks'
import { reorderPlanItems } from '@/actions/daily-plan'
import { useTranslations } from 'next-intl'

const FOCUS_MINUTES = 25
const SHORT_BREAK_MINUTES = 5
const LONG_BREAK_MINUTES = 15
const LONG_BREAK_EVERY = 4

const RING_RADIUS = 120
const RING_STROKE = 8
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2

const JORNADA_STORAGE_KEY = 'prodo_jornada_state'
const JORNADA_TIMER_START = 'prodo_jornada_timer_start'
const JORNADA_TIMER_DURATION = 'prodo_jornada_timer_duration'

type JornadaTask = {
  taskId: string
  taskTitle: string
  objectiveId: string
  objectiveColor: string
  planItemId: string
}

interface JornadaLauncherProps {
  tasks: JornadaTask[]
}

type Phase = 'focus' | 'break' | 'done'

interface JornadaState {
  currentIndex: number
  completedPomodoros: number
  phase: Phase
}

// Audio helpers
let audioCtx: AudioContext | null = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playStartTone() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 440; osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
  } catch { /* */ }
}

function playChime() {
  try {
    const ctx = getAudioCtx()
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.15
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.15, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
      osc.start(t); osc.stop(t + 0.8)
    })
  } catch { /* */ }
}

// Timer hook
function useJornadaTimer() {
  const [remainingMs, setRemainingMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const start = useCallback((durationMs: number) => {
    localStorage.setItem(JORNADA_TIMER_START, Date.now().toString())
    localStorage.setItem(JORNADA_TIMER_DURATION, durationMs.toString())
    setRemainingMs(durationMs)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    localStorage.removeItem(JORNADA_TIMER_START)
    localStorage.removeItem(JORNADA_TIMER_DURATION)
    localStorage.removeItem('prodo_jornada_paused')
    setIsRunning(false)
    setRemainingMs(0)
  }, [])

  const pause = useCallback(() => {
    const s = localStorage.getItem(JORNADA_TIMER_START)
    const d = localStorage.getItem(JORNADA_TIMER_DURATION)
    if (s && d) {
      const remaining = Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
      localStorage.setItem('prodo_jornada_paused', remaining.toString())
      localStorage.removeItem(JORNADA_TIMER_START)
      localStorage.removeItem(JORNADA_TIMER_DURATION)
      setRemainingMs(remaining)
    }
    setIsRunning(false)
  }, [])

  const resume = useCallback(() => {
    const paused = localStorage.getItem('prodo_jornada_paused')
    if (paused) {
      const remaining = parseInt(paused, 10)
      localStorage.setItem(JORNADA_TIMER_START, Date.now().toString())
      localStorage.setItem(JORNADA_TIMER_DURATION, remaining.toString())
      localStorage.removeItem('prodo_jornada_paused')
      setRemainingMs(remaining)
      setIsRunning(true)
    }
  }, [])

  const getRemaining = useCallback(() => {
    const s = localStorage.getItem(JORNADA_TIMER_START)
    const d = localStorage.getItem(JORNADA_TIMER_DURATION)
    if (!s || !d) return null
    return Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
  }, [])

  const isPaused = !isRunning && typeof window !== 'undefined' && !!localStorage.getItem('prodo_jornada_paused')

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      const s = localStorage.getItem(JORNADA_TIMER_START)
      const d = localStorage.getItem(JORNADA_TIMER_DURATION)
      if (!s || !d) { setIsRunning(false); return }
      const rem = Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
      setRemainingMs(rem)
      if (rem <= 0) {
        localStorage.removeItem(JORNADA_TIMER_START)
        localStorage.removeItem(JORNADA_TIMER_DURATION)
        setIsRunning(false)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isRunning])

  return {
    minutes: Math.floor(remainingMs / 60000),
    seconds: Math.floor((remainingMs % 60000) / 1000),
    remainingMs, isRunning, isPaused, start, stop, pause, resume, getRemaining,
  }
}

export default function JornadaLauncher({ tasks }: JornadaLauncherProps) {
  const [localTasks, setLocalTasks] = useState<JornadaTask[]>(tasks)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  
  const [jornadaState, setJornadaState] = useState<JornadaState | null>(null)
  const [distractionBuffer, setDistractionBuffer] = useState<{ type: 'internal' | 'external'; note?: string; timestamp: Date }[]>([])
  const [showDistractionFlash, setShowDistractionFlash] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const toast = useToast()
  const timer = useJornadaTimer()
  const router = useRouter()
  const t = useTranslations('Jornada')

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const jornadaRef = useRef(jornadaState)
  jornadaRef.current = jornadaState
  const distractionRef = useRef(distractionBuffer)
  distractionRef.current = distractionBuffer

  // Detect timer completion
  const prevRunning = useRef(timer.isRunning)
  useEffect(() => {
    if (prevRunning.current && !timer.isRunning && timer.remainingMs <= 0) {
      handlePhaseComplete()
    }
    prevRunning.current = timer.isRunning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isRunning, timer.remainingMs])

  // Hydrate on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(JORNADA_STORAGE_KEY)
      if (stored) {
        const state: JornadaState = JSON.parse(stored)
        const rem = timer.getRemaining()
        const paused = localStorage.getItem('prodo_jornada_paused')
        if ((rem !== null && rem > 0) || paused) {
          setJornadaState(state)
          if (rem !== null && rem > 0) {
            timer.start(0) // will read from localStorage
            // Actually need to resume properly
            localStorage.setItem(JORNADA_TIMER_START, localStorage.getItem(JORNADA_TIMER_START) || Date.now().toString())
          }
        } else {
          clearJornada()
        }
      }
    } catch { clearJornada() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(() => {
    if (jornadaState) {
      localStorage.setItem(JORNADA_STORAGE_KEY, JSON.stringify(jornadaState))
    }
  }, [jornadaState])

  function clearJornada() {
    localStorage.removeItem(JORNADA_STORAGE_KEY)
    localStorage.removeItem(JORNADA_TIMER_START)
    localStorage.removeItem(JORNADA_TIMER_DURATION)
    localStorage.removeItem('prodo_jornada_paused')
    setJornadaState(null)
  }

  async function saveSession(taskId: string, durationMinutes: number) {
    const startedAt = new Date(Date.now() - durationMinutes * 60 * 1000)
    const endedAt = new Date()
    try {
      const session = await createPomodoroSession({
        taskId,
        durationMinutes,
        status: 'completed',
        startedAt,
        endedAt,
      })
      if (distractionRef.current.length > 0) {
        await Promise.all(
          distractionRef.current.map((d) => logDistraction(session.id, d.type, d.note))
        )
      }
      setDistractionBuffer([])
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  async function handlePhaseComplete() {
    const state = jornadaRef.current
    if (!state) return

    if (state.phase === 'focus') {
      playChime()
      const currentTask = localTasks[state.currentIndex]
      if (currentTask) {
        await saveSession(currentTask.taskId, FOCUS_MINUTES)
      }

      const newPomodoros = state.completedPomodoros + 1
      const hasMoreTasks = state.currentIndex < localTasks.length - 1

      if (hasMoreTasks) {
        // Go to break, then next task
        const isLong = newPomodoros % LONG_BREAK_EVERY === 0
        const breakMin = isLong ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES
        const newState: JornadaState = { ...state, completedPomodoros: newPomodoros, phase: 'break' }
        setJornadaState(newState)
        timer.start(breakMin * 60 * 1000)
        toast({ title: isLong ? t('longBreakToast') : t('shortBreakToast'), variant: 'info' })
      } else {
        // All tasks done
        setJornadaState({ ...state, completedPomodoros: newPomodoros, phase: 'done' })
        toast({ title: t('completedToast'), variant: 'success' })
      }
    } else if (state.phase === 'break') {
      // Move to next task
      const nextIndex = state.currentIndex + 1
      const newState: JornadaState = { ...state, currentIndex: nextIndex, phase: 'focus' }
      setJornadaState(newState)
      setDistractionBuffer([])
      timer.start(FOCUS_MINUTES * 60 * 1000)
      playStartTone()
      const nextTask = localTasks[nextIndex]
      if (nextTask) {
        toast({ title: t('nextToast', { title: nextTask.taskTitle }), variant: 'info' })
      }
    }
  }

  function startJornada() {
    if (localTasks.length === 0) return
    const state: JornadaState = { currentIndex: 0, completedPomodoros: 0, phase: 'focus' }
    setJornadaState(state)
    setDistractionBuffer([])
    timer.start(FOCUS_MINUTES * 60 * 1000)
    getAudioCtx()
    playStartTone()
    toast({ title: t('startedToast', { title: localTasks[0].taskTitle }), variant: 'info' })
  }

  function handleAbort() {
    timer.stop()
    clearJornada()
    setDistractionBuffer([])
    toast({ title: t('stoppedToast'), variant: 'info' })
    router.push('/?view=plan')
  }

  const handleAddDistraction = useCallback(() => {
    setDistractionBuffer((prev) => [...prev, { type: 'internal', timestamp: new Date() }])
    setShowDistractionFlash(true)
    setTimeout(() => setShowDistractionFlash(false), 300)
  }, [])

  const handlePause = useCallback(() => {
    timer.pause()
    setDistractionBuffer((prev) => [...prev, { type: 'external', note: t('pausedState'), timestamp: new Date() }])
    toast({ title: t('pausedDistractionLog'), variant: 'info' })
  }, [timer, toast, t])

  const handleResume = useCallback(() => {
    timer.resume()
    toast({ title: t('resumedToast'), variant: 'info' })
  }, [timer, toast, t])

  // Spacebar listener
  useEffect(() => {
    if (!jornadaState || jornadaState.phase !== 'focus' || !timer.isRunning) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        handleAddDistraction()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [jornadaState, timer.isRunning, handleAddDistraction])

  async function markCurrentTaskDone() {
    if (!jornadaState) return
    const currentTask = localTasks[jornadaState.currentIndex]
    if (!currentTask) return

    // Save partial session
    const focusDurationMs = FOCUS_MINUTES * 60 * 1000
    const partialSec = timer.isRunning && timer.remainingMs > 0
      ? Math.max(0, Math.floor((focusDurationMs - timer.remainingMs) / 1000))
      : 0

    timer.stop()
    await completeTask(currentTask.taskId)

    if (partialSec > 0) {
      const startedAt = new Date(Date.now() - partialSec * 1000)
      try {
        const session = await createPomodoroSession({
          taskId: currentTask.taskId,
          durationMinutes: Math.ceil(partialSec / 60),
          status: 'completed',
          startedAt,
          endedAt: new Date(),
        })
        if (distractionBuffer.length > 0) {
          await Promise.all(distractionBuffer.map((d) => logDistraction(session.id, d.type, d.note)))
        }
      } catch { /* */ }
    }

    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)

    const newPomodoros = jornadaState.completedPomodoros + 1
    const hasMore = jornadaState.currentIndex < localTasks.length - 1

    if (hasMore) {
      const isLong = newPomodoros % LONG_BREAK_EVERY === 0
      const breakMin = isLong ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES
      
      setJornadaState({ ...jornadaState, completedPomodoros: newPomodoros, phase: 'break' })
      setDistractionBuffer([])
      timer.start(breakMin * 60 * 1000)
      toast({ title: isLong ? t('longBreakToast') : t('shortBreakToast'), variant: 'info' })
    } else {
      setJornadaState({ ...jornadaState, completedPomodoros: newPomodoros, phase: 'done' })
      toast({ title: t('completedToast'), variant: 'success' })
    }
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  async function handleDragEnd() {
    if (!jornadaState || dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null)
      setDragOverIdx(null)
      return
    }
    const reordered = [...localTasks]
    const absDrag = dragIdx + jornadaState.currentIndex + 1
    const absDrop = dragOverIdx + jornadaState.currentIndex + 1
    
    // Bounds check
    if (absDrag < localTasks.length && absDrop < localTasks.length) {
      const [moved] = reordered.splice(absDrag, 1)
      reordered.splice(absDrop, 0, moved)
      setLocalTasks(reordered)

      try {
        await reorderPlanItems(reordered.map((t) => t.planItemId))
      } catch { /* */ }
    }
    
    setDragIdx(null)
    setDragOverIdx(null)
  }

  // If no jornada running, show start button
  if (!jornadaState) {
    if (localTasks.length === 0) return null

    return (
      <Button
        onClick={startJornada}
        size="lg"
        className="w-full h-14 rounded-2xl text-[15px] font-bold gap-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-xl transition-all hover:scale-[1.01]"
      >
        <Rocket className="size-5" />
        {t('startAction', { count: localTasks.length })}
      </Button>
    )
  }

  const currentTask = localTasks[jornadaState.currentIndex]
  const upcomingTasks = localTasks.slice(jornadaState.currentIndex + 1)

  // Display helpers
  const currentDurationMs = jornadaState.phase === 'break'
    ? ((jornadaState.completedPomodoros % LONG_BREAK_EVERY === 0 ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES) * 60 * 1000)
    : FOCUS_MINUTES * 60 * 1000
  const progress = currentDurationMs > 0 ? timer.remainingMs / currentDurationMs : 0
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)
  const displayMin = String(timer.minutes).padStart(2, '0')
  const displaySec = String(timer.seconds).padStart(2, '0')

  // DONE
  if (jornadaState.phase === 'done') {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] text-foreground animate-in fade-in duration-500 flex items-center justify-center p-4">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Confetti color="#10b981" />
          </div>
        )}
        <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <Trophy className="h-9 w-9 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">{t('completedTitle')}</h3>
            <p className="text-sm text-white/50">
              {t('completedDesc', { pomodoros: jornadaState.completedPomodoros, tasks: localTasks.length })}
            </p>
          </div>
          <Button
            onClick={() => {
              clearJornada()
              router.push('/?view=plan')
              router.refresh()
            }}
            size="lg"
            className="gap-2 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold"
          >
            {t('backPlan')}
          </Button>
        </div>
      </div>
    )
  }

  // BREAK
  if (jornadaState.phase === 'break') {
    const isLong = jornadaState.completedPomodoros % LONG_BREAK_EVERY === 0
    return (
      <div className="fixed inset-0 z-50 bg-[#0c1220] text-foreground animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/3 w-[50vw] h-[50vh] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[40vw] h-[40vh] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>

        <div className="relative z-20 min-h-full w-full flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-blue-500/10 ring-1 ring-blue-500/20 mb-6 sm:mb-8">
            <Coffee className="h-7 w-7 sm:h-9 sm:w-9 text-blue-400" />
          </div>
          <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-white/90">{t('breakTitle')}</h3>
            <p className="text-xs sm:text-sm text-blue-200/50">
              {isLong ? t('breakLong') : t('breakShort')}
            </p>
          </div>

          {upcomingTasks.length > 0 && (
            <div className="w-full max-w-xs mx-auto mb-6 space-y-2">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200/40 mb-2 text-center">{t('upcomingTasks')}</p>
              <div className="space-y-1.5">
                {upcomingTasks.slice(0, 4).map((tItem, idx) => (
                  <div
                    key={tItem.taskId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ${
                      dragIdx === idx ? 'opacity-50' : ''
                    } ${dragOverIdx === idx && dragIdx !== idx ? 'border-primary' : ''}`}
                  >
                    <div className="shrink-0 cursor-grab active:cursor-grabbing text-blue-200/30">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: tItem.objectiveColor }} />
                    <span className="text-sm font-medium text-blue-100 truncate">{tItem.taskTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[256px] mx-auto flex items-center justify-center mb-6 sm:mb-8">
            <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={3} className="stroke-blue-500/10" />
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset} className="transition-[stroke-dashoffset] duration-1000 ease-linear stroke-blue-400/60" />
            </svg>
            <span className="absolute text-5xl sm:text-6xl font-mono font-medium tracking-tight text-blue-100/80 tabular-nums">{displayMin}:{displaySec}</span>
          </div>

          <Button
            onClick={() => {
              timer.stop()
              const nextIndex = jornadaState.currentIndex + 1
              setJornadaState({ ...jornadaState, currentIndex: nextIndex, phase: 'focus' })
              setDistractionBuffer([])
              timer.start(FOCUS_MINUTES * 60 * 1000)
              playStartTone()
            }}
            variant="ghost" size="sm"
            className="text-xs text-blue-300/40 hover:text-blue-200 hover:bg-blue-500/10 gap-1.5 rounded-lg"
          >
            <SkipForward className="size-3" />
            {t('skipBreak')}
          </Button>
        </div>
      </div>
    )
  }

  // FOCUS
  if (!currentTask) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] text-foreground animate-in fade-in zoom-in-[0.98] duration-500 overflow-y-auto overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <DotGrid color={currentTask.objectiveColor} />
      </div>

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti color={currentTask.objectiveColor} />
        </div>
      )}

      {/* Top: progress indicators */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          {localTasks.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                i < jornadaState.currentIndex ? 'bg-emerald-500' :
                i === jornadaState.currentIndex ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' :
                'bg-white/20'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-white/30 font-medium tracking-wide">
          {t('taskXofY', { current: jornadaState.currentIndex + 1, total: localTasks.length })}
        </p>
      </div>

      {/* Upcoming tasks — bottom right */}
      {upcomingTasks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-10 max-w-[220px] space-y-1.5 hidden sm:block pointer-events-none">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{t('nextQueue')}</p>
          {upcomingTasks.slice(0, 4).map((tItem, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tItem.objectiveColor }} />
              <span className="text-xs text-white/50 truncate">{tItem.taskTitle}</span>
            </div>
          ))}
        </div>
      )}

      {/* Center card */}
      <div className="relative z-20 min-h-full w-full flex flex-col items-center justify-center p-4 py-12 sm:p-8">
        <Card className="w-full max-w-sm mx-auto p-5 sm:p-10 text-center flex flex-col items-center border-border shadow-sm bg-card backdrop-blur-xl rounded-3xl">
          <div className="flex flex-col items-center gap-4 sm:gap-8 w-full">
            {/* Ring */}
            <div className="relative w-full aspect-square max-w-[200px] sm:max-w-[256px] mx-auto flex items-center justify-center">
              <svg
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                className="absolute inset-0 w-full h-full -rotate-90 transition-all duration-500 ease-out"
                style={{
                  filter: showDistractionFlash
                    ? 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.6))'
                    : `drop-shadow(0 0 30px ${currentTask.objectiveColor}40)`,
                  transform: showDistractionFlash ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={3} className="stroke-border/40" />
                <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset} className="transition-[stroke-dashoffset] duration-1000 ease-linear" style={{ stroke: currentTask.objectiveColor }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-6xl font-mono font-medium tracking-tight text-foreground tabular-nums">
                  {displayMin}:{displaySec}
                </span>
                <span className="text-sm font-semibold text-foreground/80 mt-3 max-w-[200px] truncate text-center">
                  {currentTask.taskTitle}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  {timer.isRunning ? t('deepWork') : timer.isPaused ? t('pausedState') : t('pausedState')}
                </span>
              </div>
              {distractionBuffer.length > 0 && (
                <Badge variant="secondary" className="absolute -top-1 right-4 gap-1 px-2.5 py-1 text-sm font-semibold shadow-md bg-destructive text-white">
                  <Zap className="size-3.5" />{distractionBuffer.length}
                </Badge>
              )}
            </div>

            <div className="w-full flex flex-col items-center gap-3 sm:gap-4 mt-2">
              <Button
                onClick={handleAddDistraction}
                variant="outline" size="lg"
                className="w-full h-12 sm:h-14 text-[14px] sm:text-[15px] font-medium gap-2 border border-border/60 bg-secondary/10 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 active:scale-[0.98] shadow-sm rounded-xl"
              >
                <AlertTriangle className="size-4" />
                {t('logDistraction')}
              </Button>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {t('pressForDistraction')}
              </p>
            </div>

            {/* Pause/Resume */}
            {timer.isRunning ? (
              <Button
                onClick={handlePause}
                variant="outline" size="lg"
                className="w-full h-12 text-[14px] font-medium gap-2 border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/50 transition-all duration-300 active:scale-[0.98] rounded-xl"
              >
                <Pause className="size-4" />
                {t('pauseBtn')}
              </Button>
            ) : timer.isPaused ? (
              <Button
                onClick={handleResume}
                variant="outline" size="lg"
                className="w-full h-12 text-[14px] font-medium gap-2 border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/50 transition-all duration-300 active:scale-[0.98] rounded-xl animate-pulse"
              >
                <Play className="size-4" />
                {t('resumeBtn')}
              </Button>
            ) : null}

            {/* Mark task done */}
            <Button
              onClick={markCurrentTaskDone}
              variant="outline" size="lg"
              className="w-full h-12 text-[14px] font-medium gap-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all duration-300 active:scale-[0.98] rounded-xl"
            >
              <CheckCircle2 className="size-4" />
              {t('taskDoneBtn')}
            </Button>

            {/* Abort */}
            <Button
              onClick={handleAbort}
              variant="ghost" size="sm"
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 mt-2 rounded-lg"
            >
              <Square className="size-3" />
              {t('stopBtn')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

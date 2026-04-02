'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/notification'
import {
  AlertTriangle, Square, Zap, Play, Clock, RotateCcw,
  Plus, Check, CircleDot, Trophy, X, Coffee, SkipForward,
  GripVertical, Rocket,
} from 'lucide-react'
import DotGrid from './dot-grid'

// ===================== Types =====================

interface GuestTask {
  id: string
  title: string
  color: string
  cycles: number
  completed: boolean
  pomodorosCompleted: number
  totalDistractions: number
}

interface GuestSessionLog {
  taskId: string
  taskTitle: string
  durationMinutes: number
  durationSeconds?: number
  distractions: number
  completedAt: number
}

interface GuestState {
  tasks: GuestTask[]
  sessions: GuestSessionLog[]
  activeTaskId: string | null
  jornadaMode: boolean // are we running through tasks in order?
}

interface CycleState {
  totalCycles: number
  currentCycle: number
  mode: 'focus' | 'break'
}

// ===================== Constants =====================

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

const FOCUS_MINUTES = 25
const SHORT_BREAK_MINUTES = 5
const LONG_BREAK_MINUTES = 15
const LONG_BREAK_EVERY = 4

const RING_RADIUS = 120
const RING_STROKE = 8
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2

// ===================== localStorage =====================

const STORAGE_KEY = 'prodo_guest_state'
const DISTRACTION_KEY = 'prodo_guest_distractions'
const TIMER_START_KEY = 'prodo_timer_start'
const TIMER_DURATION_KEY = 'prodo_timer_duration'
const CYCLE_KEY = 'prodo_cycle_state'

const EMPTY_STATE: GuestState = { tasks: [], sessions: [], activeTaskId: null, jornadaMode: false }

function readGuestState(): GuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Migrate old tasks without color/cycles
      if (parsed.tasks) {
        parsed.tasks = parsed.tasks.map((t: GuestTask) => ({
          ...t,
          color: t.color || COLORS[0],
          cycles: t.cycles || 1,
        }))
      }
      return { ...EMPTY_STATE, ...parsed }
    }
  } catch { /* ignore */ }
  return EMPTY_STATE
}

function writeGuestState(state: GuestState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function readCycleState(): CycleState | null {
  try {
    const raw = localStorage.getItem(CYCLE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return null
}

function writeCycleState(state: CycleState) {
  localStorage.setItem(CYCLE_KEY, JSON.stringify(state))
}

function clearTimerStorage() {
  localStorage.removeItem(TIMER_START_KEY)
  localStorage.removeItem(TIMER_DURATION_KEY)
  localStorage.removeItem(CYCLE_KEY)
  localStorage.removeItem(DISTRACTION_KEY)
  localStorage.removeItem('focustracker_session_start')
  localStorage.removeItem('focustracker_duration_ms')
}

// ===================== Audio =====================

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
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

function playBreakTone() {
  try {
    const ctx = getAudioCtx()
    ;[392, 440].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
      osc.start(t); osc.stop(t + 1.0)
    })
  } catch { /* */ }
}

function playTaskCompleteTone() {
  try {
    const ctx = getAudioCtx()
    ;[523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.1
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t); osc.stop(t + 0.6)
    })
  } catch { /* */ }
}

// ===================== Timer Hook =====================

function useTimer() {
  const [remainingMs, setRemainingMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const start = useCallback((durationMs: number) => {
    localStorage.setItem(TIMER_START_KEY, Date.now().toString())
    localStorage.setItem(TIMER_DURATION_KEY, durationMs.toString())
    setRemainingMs(durationMs)
    setIsRunning(true)
  }, [])

  const resume = useCallback(() => { setIsRunning(true) }, [])

  const stop = useCallback(() => {
    localStorage.removeItem(TIMER_START_KEY)
    localStorage.removeItem(TIMER_DURATION_KEY)
    setIsRunning(false)
    setRemainingMs(0)
  }, [])

  const getRemaining = useCallback(() => {
    const s = localStorage.getItem(TIMER_START_KEY)
    const d = localStorage.getItem(TIMER_DURATION_KEY)
    if (!s || !d) return null
    return Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      const s = localStorage.getItem(TIMER_START_KEY)
      const d = localStorage.getItem(TIMER_DURATION_KEY)
      if (!s || !d) { setIsRunning(false); return }
      const rem = Math.max(0, parseInt(d, 10) - (Date.now() - parseInt(s, 10)))
      setRemainingMs(rem)
      if (rem <= 0) {
        localStorage.removeItem(TIMER_START_KEY)
        localStorage.removeItem(TIMER_DURATION_KEY)
        setIsRunning(false)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isRunning])

  return {
    minutes: Math.floor(remainingMs / 60000),
    seconds: Math.floor((remainingMs % 60000) / 1000),
    remainingMs, isRunning, start, resume, stop, getRemaining,
  }
}

// ===================== Phase type =====================

type Phase = 'loading' | 'planning' | 'focus' | 'break' | 'session-done' | 'all-done'

// ===================== Main Component =====================

export default function GuestTimer() {
  const [guestState, setGuestState] = useState<GuestState>(EMPTY_STATE)
  const [phase, setPhase] = useState<Phase>('loading')
  const [cycleState, setCycleState] = useState<CycleState>({ totalCycles: 1, currentCycle: 1, mode: 'focus' })

  // Task creation state (two-step)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskColor, setNewTaskColor] = useState(COLORS[0])
  const [newTaskCycles, setNewTaskCycles] = useState(1)
  const [showCreator, setShowCreator] = useState(false)

  const [distractionCount, setDistractionCount] = useState(0)
  const [showDistractionFlash, setShowDistractionFlash] = useState(false)

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const timer = useTimer()

  // ---- Phase completion detection ----
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const cycleRef = useRef(cycleState)
  cycleRef.current = cycleState
  const guestStateRef = useRef(guestState)
  guestStateRef.current = guestState

  const prevRunning = useRef(timer.isRunning)
  useEffect(() => {
    if (prevRunning.current && !timer.isRunning && timer.remainingMs <= 0) {
      handlePhaseComplete()
    }
    prevRunning.current = timer.isRunning
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isRunning, timer.remainingMs])

  function handlePhaseComplete() {
    const p = phaseRef.current
    const c = cycleRef.current

    if (p === 'focus') {
      playChime()
      logCompletedPomodoro()

      if (c.currentCycle < c.totalCycles) {
        const isLong = c.currentCycle % LONG_BREAK_EVERY === 0
        const breakMin = isLong ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES
        const next: CycleState = { ...c, mode: 'break' }
        setCycleState(next); writeCycleState(next)
        setPhase('break')
        timer.start(breakMin * 60 * 1000)
        toast({ title: isLong ? 'Descanso largo' : 'Descanso corto', variant: 'info' })
      } else {
        // All cycles for this task done
        handleTaskCyclesDone()
      }
    } else if (p === 'break') {
      playBreakTone()
      const next: CycleState = { ...c, currentCycle: c.currentCycle + 1, mode: 'focus' }
      setCycleState(next); writeCycleState(next)
      setDistractionCount(0)
      setPhase('focus')
      timer.start(FOCUS_MINUTES * 60 * 1000)
      toast({ title: `Ciclo ${next.currentCycle} de ${next.totalCycles}`, variant: 'info' })
    }
  }

  function handleTaskCyclesDone() {
    const gs = guestStateRef.current
    if (gs.jornadaMode) {
      // Auto-advance: mark current task done and start next
      const currentIdx = gs.tasks.findIndex((t) => t.id === gs.activeTaskId)
      const nextTask = gs.tasks.find((t, i) => i > currentIdx && !t.completed)

      playTaskCompleteTone()
      setGuestState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => t.id === prev.activeTaskId ? { ...t, completed: true } : t),
      }))

      if (nextTask) {
        // Start next task
        const cs: CycleState = { totalCycles: nextTask.cycles, currentCycle: 1, mode: 'focus' }
        setCycleState(cs); writeCycleState(cs)
        setGuestState((prev) => ({ ...prev, activeTaskId: nextTask.id }))
        setDistractionCount(0)
        setPhase('focus')
        timer.start(FOCUS_MINUTES * 60 * 1000)
        toast({ title: `Siguiente: ${nextTask.title}`, variant: 'info' })
      } else {
        // All tasks done
        clearTimerStorage()
        setGuestState((prev) => ({ ...prev, activeTaskId: null, jornadaMode: false }))
        setPhase('all-done')
        toast({ title: 'Jornada completada', variant: 'success' })
      }
    } else {
      setPhase('session-done')
      toast({ title: 'Ciclos completados', variant: 'success' })
    }
  }

  function logCompletedPomodoro() {
    setGuestState((prev) => {
      const task = prev.tasks.find((t) => t.id === prev.activeTaskId)
      if (!task) return prev
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id
            ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1, totalDistractions: t.totalDistractions + distractionCount }
            : t
        ),
        sessions: [...prev.sessions, {
          taskId: task.id, taskTitle: task.title,
          durationMinutes: FOCUS_MINUTES, durationSeconds: FOCUS_MINUTES * 60,
          distractions: distractionCount, completedAt: Date.now(),
        }],
      }
    })
    localStorage.removeItem(DISTRACTION_KEY)
  }

  // ---- Hydrate ----
  useEffect(() => {
    const stored = readGuestState()
    setGuestState(stored)
    const rem = timer.getRemaining()
    const savedCycle = readCycleState()
    if (rem !== null && rem > 0 && stored.activeTaskId && savedCycle) {
      setCycleState(savedCycle)
      const d = localStorage.getItem(DISTRACTION_KEY)
      if (d) setDistractionCount(parseInt(d, 10))
      setPhase(savedCycle.mode === 'break' ? 'break' : 'focus')
      timer.resume()
    } else { clearTimerStorage(); setPhase('planning') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasHydrated = phase !== 'loading'
  useEffect(() => { if (hasHydrated) writeGuestState(guestState) }, [guestState, hasHydrated])
  useEffect(() => { if (phase === 'focus') localStorage.setItem(DISTRACTION_KEY, String(distractionCount)) }, [distractionCount, phase])

  // ---- Derived ----
  const activeTask = guestState.tasks.find((t) => t.id === guestState.activeTaskId) ?? null
  const incompleteTasks = guestState.tasks.filter((t) => !t.completed)
  const completedTasks = guestState.tasks.filter((t) => t.completed)
  const totalSessions = guestState.sessions.length
  const totalSeconds = guestState.sessions.reduce((sum, s) => sum + (s.durationSeconds ?? s.durationMinutes * 60), 0)
  const totalMinDisplay = Math.floor(totalSeconds / 60)
  const totalSecDisplay = totalSeconds % 60
  const totalDistractions = guestState.sessions.reduce((sum, s) => sum + s.distractions, 0)
  const allTasksDone = guestState.tasks.length > 0 && incompleteTasks.length === 0
  const upcomingTasks = guestState.tasks.filter((t) => !t.completed && t.id !== guestState.activeTaskId)

  // ---- Distraction ----
  const handleAddDistraction = useCallback(() => {
    setDistractionCount((c) => c + 1)
    setShowDistractionFlash(true)
    toast({ title: 'Distraccion registrada', variant: 'info' })
    setTimeout(() => setShowDistractionFlash(false), 300)
  }, [toast])

  useEffect(() => {
    if (phase !== 'focus' || !timer.isRunning) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); handleAddDistraction() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, timer.isRunning, handleAddDistraction])

  // ---- Task management ----

  function submitNewTask() {
    const title = newTaskTitle.trim()
    if (!title) return
    setGuestState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, {
        id: crypto.randomUUID(), title, color: newTaskColor, cycles: newTaskCycles,
        completed: false, pomodorosCompleted: 0, totalDistractions: 0,
      }],
    }))
    setNewTaskTitle(''); setNewTaskCycles(1); setNewTaskColor(COLORS[0]); setShowCreator(false)
    inputRef.current?.focus()
  }

  function toggleTask(id: string) {
    const task = guestState.tasks.find((t) => t.id === id)
    if (task && !task.completed) { playTaskCompleteTone() }
    setGuestState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t),
    }))
  }

  function removeTask(id: string) {
    setGuestState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
      sessions: prev.sessions.filter((s) => s.taskId !== id),
    }))
  }

  function startTaskSession(taskId: string) {
    const task = guestState.tasks.find((t) => t.id === taskId)
    if (!task) return
    const cs: CycleState = { totalCycles: task.cycles, currentCycle: 1, mode: 'focus' }
    setCycleState(cs); writeCycleState(cs)
    setGuestState((prev) => ({ ...prev, activeTaskId: taskId, jornadaMode: false }))
    setDistractionCount(0); setPhase('focus')
    timer.start(FOCUS_MINUTES * 60 * 1000)
    getAudioCtx(); playStartTone()
  }

  function startJornada() {
    const first = incompleteTasks[0]
    if (!first) return
    const cs: CycleState = { totalCycles: first.cycles, currentCycle: 1, mode: 'focus' }
    setCycleState(cs); writeCycleState(cs)
    setGuestState((prev) => ({ ...prev, activeTaskId: first.id, jornadaMode: true }))
    setDistractionCount(0); setPhase('focus')
    timer.start(FOCUS_MINUTES * 60 * 1000)
    getAudioCtx(); playStartTone()
    toast({ title: `Jornada iniciada: ${first.title}`, variant: 'info' })
  }

  function handleAbort() {
    timer.stop(); clearTimerStorage()
    setGuestState((prev) => ({ ...prev, activeTaskId: null, jornadaMode: false }))
    setDistractionCount(0); setPhase('planning')
    toast({ title: 'Sesion detenida', variant: 'info' })
  }

  function handleBackToPlanning() {
    clearTimerStorage()
    setGuestState((prev) => ({ ...prev, activeTaskId: null, jornadaMode: false }))
    setDistractionCount(0); setPhase('planning')
  }

  function markActiveTaskDone() {
    if (!activeTask) return
    playTaskCompleteTone()
    const focusDurationMs = FOCUS_MINUTES * 60 * 1000
    let partialSec = 0
    if (phase === 'focus' && timer.isRunning && timer.remainingMs > 0) {
      partialSec = Math.max(0, Math.floor((focusDurationMs - timer.remainingMs) / 1000))
    }
    timer.stop(); clearTimerStorage()

    const gs = guestStateRef.current
    if (gs.jornadaMode) {
      // In jornada: mark done and advance
      const currentIdx = gs.tasks.findIndex((t) => t.id === activeTask.id)
      const nextTask = gs.tasks.find((t, i) => i > currentIdx && !t.completed && t.id !== activeTask.id)

      setGuestState((prev) => {
        const log: GuestSessionLog | null = partialSec > 0 ? {
          taskId: activeTask.id, taskTitle: activeTask.title,
          durationMinutes: Math.floor(partialSec / 60), durationSeconds: partialSec,
          distractions: distractionCount, completedAt: Date.now(),
        } : null
        return {
          ...prev,
          tasks: prev.tasks.map((t) => t.id === activeTask.id ? { ...t, completed: true } : t),
          sessions: log ? [...prev.sessions, log] : prev.sessions,
          activeTaskId: nextTask?.id ?? null,
          jornadaMode: !!nextTask,
        }
      })

      if (nextTask) {
        const cs: CycleState = { totalCycles: nextTask.cycles, currentCycle: 1, mode: 'focus' }
        setCycleState(cs); writeCycleState(cs)
        setDistractionCount(0); setPhase('focus')
        timer.start(FOCUS_MINUTES * 60 * 1000)
        playStartTone()
        toast({ title: `Siguiente: ${nextTask.title}`, variant: 'info' })
      } else {
        setPhase('all-done')
        toast({ title: 'Jornada completada', variant: 'success' })
      }
    } else {
      setGuestState((prev) => {
        const log: GuestSessionLog | null = partialSec > 0 ? {
          taskId: activeTask.id, taskTitle: activeTask.title,
          durationMinutes: Math.floor(partialSec / 60), durationSeconds: partialSec,
          distractions: distractionCount, completedAt: Date.now(),
        } : null
        return {
          ...prev,
          tasks: prev.tasks.map((t) => t.id === activeTask.id ? { ...t, completed: true } : t),
          sessions: log ? [...prev.sessions, log] : prev.sessions,
          activeTaskId: null,
        }
      })
      setDistractionCount(0); setPhase('planning')
      toast({ title: 'Tarea completada', variant: 'success' })
    }
  }

  function skipBreak() {
    timer.stop()
    const next: CycleState = { ...cycleState, currentCycle: cycleState.currentCycle + 1, mode: 'focus' }
    setCycleState(next); writeCycleState(next)
    setDistractionCount(0); setPhase('focus')
    timer.start(FOCUS_MINUTES * 60 * 1000)
    toast({ title: `Ciclo ${next.currentCycle} de ${next.totalCycles}`, variant: 'info' })
    playStartTone()
  }

  function handleFinishDay() { setPhase('all-done') }
  function handleResetAll() { setGuestState(EMPTY_STATE); clearTimerStorage(); setPhase('planning') }

  // ---- Drag & drop ----
  function handleDragStart(idx: number) { setDragIdx(idx) }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx) }
  function handleDragEnd() {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setGuestState((prev) => {
        const tasks = [...prev.tasks]
        const [moved] = tasks.splice(dragIdx, 1)
        tasks.splice(dragOverIdx, 0, moved)
        return { ...prev, tasks }
      })
    }
    setDragIdx(null); setDragOverIdx(null)
  }

  // ---- Display helpers ----
  const currentDurationMs = phase === 'break'
    ? (cycleState.currentCycle % LONG_BREAK_EVERY === 0 ? LONG_BREAK_MINUTES : SHORT_BREAK_MINUTES) * 60 * 1000
    : FOCUS_MINUTES * 60 * 1000
  const displayMin = String(timer.minutes).padStart(2, '0')
  const displaySec = String(timer.seconds).padStart(2, '0')
  const progress = currentDurationMs > 0 ? timer.remainingMs / currentDurationMs : 0
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)

  // ===================== LOADING =====================
  if (phase === 'loading') {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/30 ring-1 ring-border/50 shadow-inner">
          <Clock className="h-7 w-7 text-white/80 animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Planifica tu dia</h2>
      </div>
    )
  }

  // ===================== FOCUS =====================
  if (phase === 'focus' && activeTask) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] text-foreground animate-in fade-in zoom-in-[0.98] duration-500 overflow-y-auto overflow-x-hidden">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <DotGrid color={activeTask.color} />
        </div>
        
        {/* Scrollable Center Content */}
        <div className="relative z-20 min-h-full w-full flex flex-col justify-between py-6 px-4 sm:p-8">
          
          {/* Top Bar: Cycles + Clock */}
          <div className="w-full flex justify-between items-start mb-6 max-w-2xl mx-auto sm:absolute sm:top-6 sm:left-6 sm:right-6 sm:w-auto sm:max-w-none pointer-events-none z-10">
            <div className="flex flex-col gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: cycleState.totalCycles }).map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full transition-all ${i < cycleState.currentCycle - 1 ? 'bg-emerald-500' : i === cycleState.currentCycle - 1 ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]' : 'bg-white/20'}`} />
                ))}
              </div>
              <p className="text-[10px] text-white/30 font-medium tracking-wide">Ciclo {cycleState.currentCycle}/{cycleState.totalCycles}</p>
            </div>
            <LiveClock className="pointer-events-auto" />
          </div>

          {/* Center Card */}
          <div className="flex-1 flex flex-col justify-center items-center w-full z-10 pointer-events-auto my-6 sm:my-auto">
            <Card className="w-full max-w-sm mx-auto p-5 sm:p-10 text-center flex flex-col items-center border-border shadow-sm bg-card backdrop-blur-xl rounded-3xl relative">
              <div className="flex flex-col items-center gap-4 sm:gap-8 w-full">
                <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[256px] mx-auto flex items-center justify-center">
                  <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 w-full h-full -rotate-90" style={{ filter: showDistractionFlash ? 'drop-shadow(0 0 20px rgba(239,68,68,0.6))' : `drop-shadow(0 0 30px ${activeTask.color}20)`, transform: showDistractionFlash ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.3s ease-out' }}>
                    <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={3} className="stroke-border/40" />
                    <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset} className="transition-[stroke-dashoffset] duration-1000 ease-linear" style={{ stroke: activeTask.color }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center max-w-[85%] mx-auto text-center py-4">
                    <span className="text-5xl sm:text-6xl font-mono font-medium tracking-tight text-foreground tabular-nums">{displayMin}:{displaySec}</span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground/80 mt-1 sm:mt-3 line-clamp-2 px-2">{activeTask.title}</span>
                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">Deep Work</span>
                  </div>
                  {distractionCount > 0 && (
                    <Badge variant="secondary" className="absolute -top-1 sm:-top-2 right-2 sm:right-4 gap-1 px-2.5 py-1 text-xs sm:text-sm font-semibold shadow-md bg-destructive text-white"><Zap className="size-3 sm:size-3.5" />{distractionCount}</Badge>
                  )}
                </div>
                
                <div className="w-full flex flex-col items-center gap-3 sm:gap-4 mt-2 sm:mb-2">
                  <Button onClick={handleAddDistraction} variant="outline" size="lg" className="w-full h-12 sm:h-14 text-[14px] sm:text-[15px] font-medium gap-2 border border-border/60 bg-secondary/10 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all active:scale-[0.98] rounded-xl"><AlertTriangle className="size-4" />Log Distraction</Button>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-widest hidden sm:block">Press <kbd className="mx-1.5 px-1.5 py-0.5 rounded bg-secondary border border-border/50 font-mono text-foreground shadow-sm">Space</kbd> to record</p>
                </div>
                <Button onClick={markActiveTaskDone} variant="outline" size="lg" className="w-full h-12 text-[14px] font-medium gap-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all active:scale-[0.98] rounded-xl"><Check className="size-4" />Tarea Completada</Button>
                <Button onClick={handleAbort} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 mt-1 rounded-lg"><Square className="size-3" />Abort Session</Button>
              </div>
            </Card>
          </div>

          {/* Bottom section: Upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <div className="w-full sm:absolute sm:bottom-6 sm:right-6 sm:max-w-[220px] flex flex-col items-center sm:items-end z-10 pointer-events-none mt-6 sm:mt-0">
              <div className="w-full max-w-[280px] sm:w-auto space-y-1.5 pointer-events-auto flex flex-col items-center sm:items-end">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">A continuacion</p>
                {upcomingTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-xs text-white/50 truncate flex-1 text-left sm:text-right">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ===================== BREAK =====================
  if (phase === 'break' && activeTask) {
    const isLong = cycleState.currentCycle % LONG_BREAK_EVERY === 0
    return (
      <div className="fixed inset-0 z-50 bg-[#0c1220] text-foreground animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/3 w-[50vw] h-[50vh] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[40vw] h-[40vh] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>
        
        <div className="relative z-20 min-h-full w-full flex flex-col justify-between py-6 px-4 sm:p-8">
          
          {/* Top Bar: Cycles + Clock */}
          <div className="w-full flex justify-between items-start mb-6 max-w-2xl mx-auto sm:absolute sm:top-6 sm:left-6 sm:right-6 sm:w-auto sm:max-w-none pointer-events-none z-10">
            <div className="flex flex-col gap-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: cycleState.totalCycles }).map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${i < cycleState.currentCycle ? 'bg-emerald-500' : 'bg-white/20'}`} />
                ))}
              </div>
              <p className="text-[10px] text-blue-300/40 font-medium tracking-wide">Descanso {isLong ? 'largo' : 'corto'}</p>
            </div>
            <LiveClock className="pointer-events-auto" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full z-10 pointer-events-auto my-6 sm:my-auto text-center relative">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-blue-500/10 ring-1 ring-blue-500/20 mb-6 sm:mb-8 mx-auto"><Coffee className="h-7 w-7 sm:h-9 sm:w-9 text-blue-400" /></div>
            <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-white/90">Descanso</h3>
              <p className="text-xs sm:text-sm text-blue-200/50">{isLong ? 'Descansa 15 minutos. Estirarte, hidratarte.' : 'Descansa 5 minutos. Respira profundo.'}</p>
            </div>
            
            <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[256px] mx-auto flex items-center justify-center mb-6 sm:mb-8">
              <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={3} className="stroke-blue-500/10" />
                <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset} className="transition-[stroke-dashoffset] duration-1000 ease-linear stroke-blue-400/60" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-5xl sm:text-6xl font-mono font-medium tracking-tight text-blue-100/80 tabular-nums">{displayMin}:{displaySec}</span>
              </div>
            </div>
            
            <Button onClick={skipBreak} variant="ghost" size="sm" className="text-xs text-blue-300/40 hover:text-blue-200 hover:bg-blue-500/10 gap-1.5 rounded-lg"><SkipForward className="size-3" />Saltar descanso</Button>
          </div>
          
          {/* Spacer for bottom if needed (only to keep justify-between balanced if no upcoming tasks normally) */}
          <div className="hidden sm:block opacity-0 pointer-events-none h-1" />
        </div>
      </div>
    )
  }

  // ===================== SESSION DONE =====================
  if (phase === 'session-done' && activeTask) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20"><Check className="h-7 w-7 text-emerald-500" /></div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-foreground">{cycleState.totalCycles > 1 ? `${cycleState.totalCycles} ciclos completados` : 'Pomodoro completado'}</h3>
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{activeTask.title}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button onClick={markActiveTaskDone} size="lg" className="flex-1 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"><Check className="size-4" />Tarea completada</Button>
          <Button onClick={handleBackToPlanning} variant="outline" size="lg" className="flex-1 gap-2 rounded-xl">Volver al plan</Button>
        </div>
      </div>
    )
  }

  // ===================== ALL DONE =====================
  if (phase === 'all-done') {
    const avgDist = totalSessions > 0 ? (totalDistractions / totalSessions).toFixed(1) : '0'
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-500/20"><Trophy className="h-9 w-9 text-emerald-500" /></div>
        <div className="space-y-2"><h3 className="text-2xl font-bold text-foreground">Dia completado</h3><p className="text-sm text-muted-foreground">Asi te fue hoy.</p></div>
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 space-y-1"><p className="text-2xl font-bold text-foreground">{completedTasks.length}</p><p className="text-[11px] text-muted-foreground font-medium">Tareas</p></div>
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 space-y-1"><p className="text-2xl font-bold text-foreground">{totalSessions}</p><p className="text-[11px] text-muted-foreground font-medium">Pomodoros</p></div>
          <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 space-y-1"><p className="text-2xl font-bold text-foreground">{totalMinDisplay}<span className="text-sm font-normal text-muted-foreground">m</span> {totalSecDisplay}<span className="text-sm font-normal text-muted-foreground">s</span></p><p className="text-[11px] text-muted-foreground font-medium">Enfoque</p></div>
        </div>
        <div className="w-full rounded-xl border border-border/40 bg-secondary/10 px-4 py-3 flex items-center justify-between"><span className="text-sm text-muted-foreground">Distracciones promedio</span><span className="text-lg font-bold text-foreground">{avgDist}</span></div>
        <div className="w-full space-y-2 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Resumen</p>
          {guestState.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ borderLeft: `3px solid ${t.color}`, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <span className="text-sm text-foreground truncate flex-1">{t.title}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-3">
                {t.pomodorosCompleted > 0 && <span>{t.pomodorosCompleted}x 25m</span>}
                {t.completed && <Check className="size-3 text-emerald-500" />}
                {t.totalDistractions > 0 && <span className="text-destructive/70">{t.totalDistractions} dist.</span>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50">Crea una cuenta para guardar tu historial.</p>
        <Button onClick={handleResetAll} variant="outline" size="lg" className="gap-2 rounded-xl"><RotateCcw className="size-4" />Nuevo dia</Button>
      </div>
    )
  }

  // ===================== PLANNING =====================
  if (allTasksDone) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20"><Trophy className="h-7 w-7 text-emerald-500" /></div>
        <div className="text-center space-y-2"><h3 className="text-2xl font-bold text-foreground">Todas las tareas completadas</h3><p className="text-sm text-muted-foreground">Completaste {completedTasks.length} tarea{completedTasks.length !== 1 ? 's' : ''}.</p></div>
        <Button onClick={handleFinishDay} size="lg" className="gap-2 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold"><Trophy className="size-4" />Ver resumen del dia</Button>
        <Button onClick={handleResetAll} variant="ghost" size="sm" className="text-xs text-muted-foreground">Reiniciar todo</Button>
      </div>
    )
  }

  const totalPlannedMin = incompleteTasks.reduce((sum, t) => sum + t.cycles * 25, 0)

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Planifica tu dia</h2>
        <p className="text-[15px] font-medium text-muted-foreground">Agrega tus tareas y entra en la zona.</p>
      </div>

      <Card className="rounded-2xl border border-neutral-700/60 bg-neutral-900 p-5 sm:p-6 space-y-4">
        {/* Task name input */}
        {!showCreator ? (
          <form onSubmit={(e) => { e.preventDefault(); if (newTaskTitle.trim()) setShowCreator(true) }} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nueva tarea..."
              className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-400 transition"
            />
            <Button type="submit" size="lg" disabled={!newTaskTitle.trim()} className="rounded-lg px-4 bg-white text-neutral-900 hover:bg-neutral-200 disabled:opacity-30"><Plus className="size-5" /></Button>
          </form>
        ) : (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-100 truncate">{newTaskTitle}</span>
              <button type="button" onClick={() => { setShowCreator(false); setNewTaskTitle('') }} className="text-neutral-500 hover:text-neutral-300 transition"><X className="size-4" /></button>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-neutral-500 font-medium">Color</p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" onClick={() => setNewTaskColor(c)}
                    className={`h-6 w-6 rounded-full transition-all ${newTaskColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Cycle picker */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-neutral-500 font-medium">Ciclos de pomodoro</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n} type="button" onClick={() => setNewTaskCycles(n)}
                    className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                      newTaskCycles === n
                        ? 'border-white bg-white text-neutral-900'
                        : 'border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    {n}x <span className={newTaskCycles === n ? 'text-neutral-500' : 'text-neutral-500'}>{n * 25}m</span>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={submitNewTask} className="w-full rounded-lg bg-white text-neutral-900 hover:bg-neutral-200 font-semibold gap-2"><Plus className="size-4" />Agregar tarea</Button>
          </div>
        )}

        {guestState.tasks.length > 0 && <div className="border-t border-neutral-700/60" />}

        {/* Task list with drag & drop */}
        {guestState.tasks.length > 0 ? (
          <div className="space-y-1">
            {guestState.tasks.map((task, idx) => (
              <div
                key={task.id}
                draggable={!task.completed}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2.5 transition ${
                  dragOverIdx === idx && dragIdx !== idx ? 'border-t-2 border-white/30' : ''
                } ${dragIdx === idx ? 'opacity-40' : ''} hover:bg-neutral-800`}
                style={{ borderLeft: `3px solid ${task.color}` }}
              >
                {/* Drag handle */}
                {!task.completed && (
                  <div className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-neutral-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <GripVertical className="size-3.5" />
                  </div>
                )}
                {task.completed && <div className="w-[14px] shrink-0" />}

                {/* Checkbox */}
                <button
                  type="button" onClick={() => toggleTask(task.id)}
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px] transition ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-500 hover:border-neutral-300'}`}
                >
                  {task.completed && <Check className="size-3" strokeWidth={3} />}
                </button>

                {/* Title */}
                <span className={`flex-1 text-sm truncate ${task.completed ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>{task.title}</span>

                {/* Cycle info */}
                <span className="text-[11px] text-neutral-500 tabular-nums shrink-0">
                  {task.pomodorosCompleted > 0 ? `${task.pomodorosCompleted}/` : ''}{task.cycles}x 25m
                </span>

                {/* Play */}
                {!task.completed && (
                  <button type="button" onClick={() => startTaskSession(task.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:text-white hover:bg-neutral-700 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <Play className="size-3.5 fill-current" />
                  </button>
                )}

                {/* Delete */}
                <button type="button" onClick={() => removeTask(task.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:text-red-400 hover:bg-neutral-700 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6"><p className="text-sm text-neutral-500">Escribe tu primera tarea para comenzar.</p></div>
        )}

        {/* Stats */}
        {totalSessions > 0 && (
          <>
            <div className="border-t border-neutral-700/60" />
            <div className="flex items-center justify-center gap-6 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5"><CircleDot className="size-3" />{totalSessions} pomodoro{totalSessions !== 1 ? 's' : ''}</span>
              <span>{totalMinDisplay}m {totalSecDisplay}s</span>
              {totalDistractions > 0 && <span>{totalDistractions} dist.</span>}
            </div>
          </>
        )}
      </Card>

      {/* Comenzar jornada */}
      {incompleteTasks.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={startJornada} size="lg" className="w-full max-w-xs h-14 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-200 font-bold text-[15px] gap-3 shadow-xl transition-all hover:scale-[1.02]">
            <Rocket className="size-5" />Comenzar jornada
          </Button>
          <p className="text-xs text-neutral-600">{incompleteTasks.length} tarea{incompleteTasks.length !== 1 ? 's' : ''} · {totalPlannedMin}m planificados</p>
        </div>
      )}

      <p className="text-xs text-neutral-600 text-center">
        Presiona <kbd className="inline-flex items-center rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-neutral-400">Espacio</kbd> durante una sesion para registrar distracciones
      </p>
    </div>
  )
}

// ===================== LiveClock =====================

function LiveClock({ className = '' }: { className?: string }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  const date = now.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`text-right space-y-0.5 ${className}`}>
      <p className="text-sm font-mono font-medium text-white/60 tabular-nums leading-none">{time}</p>
      <p className="text-[11px] text-white/30 capitalize leading-none">{date}</p>
    </div>
  )
}

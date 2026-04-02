'use client'

import { useState, useEffect, useCallback } from 'react'
import { useResilientTimer } from '@/hooks/use-resilient-timer'
import { createPomodoroSession } from '@/actions/sessions'
import { logDistraction } from '@/actions/distractions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/notification'
import { AlertTriangle, Square, Zap, CheckCircle2 } from 'lucide-react'

interface PomodoroTimerProps {
  taskId: string
  taskTitle?: string
  durationMinutes: number
  onSessionEnd?: (status: 'completed' | 'aborted') => void
  onTaskDone?: () => void
  themeColor?: string
}

interface BufferedDistraction {
  type: 'internal' | 'external'
  note?: string
  timestamp: Date
}

const RING_RADIUS = 120
const RING_STROKE = 8
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2

export default function PomodoroTimer({
  taskId,
  taskTitle,
  durationMinutes,
  onSessionEnd,
  onTaskDone,
  themeColor = '#3b82f6',
}: PomodoroTimerProps) {
  const [distractionBuffer, setDistractionBuffer] = useState<BufferedDistraction[]>([])
  const [showDistractionFlash, setShowDistractionFlash] = useState(false)
  const toast = useToast()

  const totalMs = durationMinutes * 60 * 1000

  const { minutes, seconds, remainingMs, isRunning, startTimer, stopTimer } = useResilientTimer({
    durationMinutes,
    onComplete: handleSessionComplete,
  })

  async function handleSessionComplete() {
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

      // Flush distraction buffer
      if (distractionBuffer.length > 0) {
        await Promise.all(
          distractionBuffer.map((d) => logDistraction(session.id, d.type, d.note))
        )
      }

      toast({
        title: 'Sesión finalizada',
        description: 'Tu Pomodoro se guardó correctamente.',
        variant: 'success',
      })

      onSessionEnd?.('completed')
    } catch (error) {
      console.error('Failed to save session:', error)
      toast({
        title: 'Error al guardar sesión',
        description: 'Hubo un problema al registrar tu sesión.',
        variant: 'error',
      })
    }
  }

  async function handleAbort() {
    stopTimer()

    const startedAt = new Date(
      Date.now() - (durationMinutes * 60 * 1000 - (minutes * 60 + seconds) * 1000)
    )
    const endedAt = new Date()

    try {
      const session = await createPomodoroSession({
        taskId,
        durationMinutes,
        status: 'aborted',
        startedAt,
        endedAt,
      })

      if (distractionBuffer.length > 0) {
        await Promise.all(
          distractionBuffer.map((d) => logDistraction(session.id, d.type, d.note))
        )
      }

      toast({
        title: 'Sesión detenida',
        description: 'La sesión se guardó como abortada.',
        variant: 'info',
      })
      onSessionEnd?.('aborted')
    } catch (error) {
      console.error('Failed to save aborted session:', error)
      toast({
        title: 'Error al detener sesión',
        description: 'Hubo un problema al guardar la sesión abortada.',
        variant: 'error',
      })
    }
  }

  const handleAddDistraction = useCallback(
    (type: 'internal' | 'external') => {
      setDistractionBuffer((prev) => [
        ...prev,
        { type, timestamp: new Date() },
      ])
      setShowDistractionFlash(true)
      toast({
        title: 'Distracción registrada',
        description: 'Se almacenó un nuevo evento mientras te enfocabas.',
        variant: 'info',
      })
      setTimeout(() => setShowDistractionFlash(false), 300)
    },
    [toast]
  )

  // Spacebar hotkey listener
  useEffect(() => {
    if (!isRunning) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault()
        handleAddDistraction('internal')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, handleAddDistraction, onSessionEnd])

  // Auto-start the timer on mount
  useEffect(() => {
    startTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayMinutes = String(minutes).padStart(2, '0')
  const displaySeconds = String(seconds).padStart(2, '0')

  const progress = remainingMs / totalMs
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress)

  return (
    <Card className="w-full relative z-10 p-5 sm:p-10 text-center flex flex-col items-center border-border shadow-sm bg-card backdrop-blur-xl rounded-3xl">
      <div className="flex flex-col items-center gap-4 sm:gap-8 w-full max-w-sm">
        {/* SVG Progress Ring */}
        <div className="relative w-full aspect-square max-w-[200px] sm:max-w-[256px] mx-auto flex items-center justify-center">
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className={`absolute inset-0 w-full h-full -rotate-90 transition-all duration-500 ease-out`}
            style={{
              filter: showDistractionFlash
                ? 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.6))'
                : isRunning 
                  ? `drop-shadow(0 0 30px ${themeColor}40)` 
                  : 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
              transform: showDistractionFlash ? 'scale(1.05)' : 'scale(1)'
            }}
          >
            {/* Background track */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={3}
              className="stroke-border/40"
            />
            {/* Progress arc */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              style={{ stroke: themeColor }}
            />
          </svg>

          {/* Time display centered inside ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-6xl font-mono font-medium tracking-tight text-foreground tabular-nums">
              {displayMinutes}:{displaySeconds}
            </span>
            {taskTitle && (
              <span className="text-sm font-semibold text-foreground/80 mt-3 max-w-[200px] truncate text-center">
                {taskTitle}
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {isRunning ? 'Deep Work' : 'Paused'}
            </span>
          </div>

          {/* Distraction count badge floating on the ring */}
          {distractionBuffer.length > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 right-4 gap-1 px-2.5 py-1 text-sm font-semibold shadow-md bg-destructive text-white"
            >
              <Zap className="size-3.5" />
              {distractionBuffer.length}
            </Badge>
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-3 sm:gap-4 mt-2">
          {/* Distraction button - large and obvious */}
          <Button
            onClick={() => handleAddDistraction('internal')}
            variant="outline"
            size="lg"
            className="w-full h-12 sm:h-14 text-[14px] sm:text-[15px] font-medium gap-2 border border-border/60 bg-secondary/10 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 active:scale-[0.98] shadow-sm rounded-xl"
          >
            <AlertTriangle className="size-4" />
            Log Distraction
          </Button>

          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Press <kbd className="mx-1.5 px-1.5 py-0.5 rounded bg-secondary border border-border/50 font-mono text-foreground shadow-sm">Space</kbd> to record
          </p>
        </div>

        {/* Task done button */}
        {onTaskDone && (
          <Button
            onClick={onTaskDone}
            variant="outline"
            size="lg"
            className="w-full h-12 text-[14px] font-medium gap-2 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all duration-300 active:scale-[0.98] rounded-xl"
          >
            <CheckCircle2 className="size-4" />
            Tarea Completada
          </Button>
        )}

        {/* Abort button - smaller and subtle */}
        <Button
          onClick={handleAbort}
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 mt-2 rounded-lg"
        >
          <Square className="size-3" />
          Abort Session
        </Button>
      </div>
    </Card>
  )
}

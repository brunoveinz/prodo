'use client'

import { useState, useEffect, useCallback } from 'react'
import { useResilientTimer } from '@/hooks/use-resilient-timer'
import { createPomodoroSession } from '@/actions/sessions'
import { logDistraction } from '@/actions/distractions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PomodoroTimerProps {
  taskId: string
  durationMinutes: number
  onSessionEnd?: (status: 'completed' | 'aborted') => void
}

interface BufferedDistraction {
  type: 'internal' | 'external'
  note?: string
  timestamp: Date
}

export default function PomodoroTimer({
  taskId,
  durationMinutes,
  onSessionEnd,
}: PomodoroTimerProps) {
  const [distractionBuffer, setDistractionBuffer] = useState<BufferedDistraction[]>([])
  const [showDistractionFlash, setShowDistractionFlash] = useState(false)

  const { minutes, seconds, isRunning, startTimer, stopTimer } = useResilientTimer({
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

      onSessionEnd?.('completed')
    } catch (error) {
      console.error('Failed to save session:', error)
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

      // Don't flush distractions for aborted sessions (optional: change if desired)
      if (distractionBuffer.length > 0) {
        await Promise.all(
          distractionBuffer.map((d) => logDistraction(session.id, d.type, d.note))
        )
      }

      onSessionEnd?.('aborted')
    } catch (error) {
      console.error('Failed to save aborted session:', error)
    }
  }

  const handleAddDistraction = useCallback(
    (type: 'internal' | 'external') => {
      setDistractionBuffer((prev) => [
        ...prev,
        { type, timestamp: new Date() },
      ])
      setShowDistractionFlash(true)
      setTimeout(() => setShowDistractionFlash(false), 200)
    },
    []
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

  return (
    <Card
      className={`p-8 text-center transition-all ${
        showDistractionFlash ? 'ring-2 ring-yellow-500' : ''
      }`}
    >
      <div className="space-y-6">
        {/* Timer display */}
        <div className="space-y-2">
          <div className="text-7xl font-mono font-bold text-gray-900 dark:text-white tracking-tight">
            {displayMinutes}:{displaySeconds}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Pomodoro Timer
          </p>
        </div>

        {/* Distraction counter */}
        {distractionBuffer.length > 0 && (
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              Distractions: {distractionBuffer.length}
            </Badge>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => handleAddDistraction('internal')}
            variant="outline"
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            📵 Log Distraction (or Space)
          </Button>

          <Button
            onClick={handleAbort}
            variant="destructive"
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            ⏹️ Abort Session
          </Button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 pt-4">
          The timer will continue even if you switch tabs or refresh
        </p>
      </div>
    </Card>
  )
}

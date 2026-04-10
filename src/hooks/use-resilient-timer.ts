'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseResilientTimerOptions {
  durationMinutes: number
  onComplete?: () => void
  onTick?: (remainingMs: number) => void
}

export function useResilientTimer({
  durationMinutes,
  onComplete,
  onTick,
}: UseResilientTimerOptions) {
  const [isRunning, setIsRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState(durationMinutes * 60 * 1000)

  const startTimer = useCallback(() => {
    // Check if timer is paused — don't overwrite paused state
    const pausedRemaining = localStorage.getItem('focustracker_paused_remaining')
    if (pausedRemaining && parseInt(pausedRemaining, 10) > 0) {
      // Timer is paused, don't auto-start a new session
      return
    }

    // Check if there's already a running session (e.g. after page refresh)
    const existingStart = localStorage.getItem('focustracker_session_start')
    const existingDuration = localStorage.getItem('focustracker_duration_ms')
    if (existingStart && existingDuration) {
      const elapsed = Date.now() - parseInt(existingStart, 10)
      if (elapsed < parseInt(existingDuration, 10)) {
        // Resume existing session, don't overwrite
        setIsRunning(true)
        return
      }
    }

    // Start fresh session
    const startTime = Date.now()
    localStorage.setItem('focustracker_session_start', startTime.toString())
    localStorage.setItem('focustracker_duration_ms', (durationMinutes * 60 * 1000).toString())
    setIsRunning(true)
  }, [durationMinutes])

  const stopTimer = useCallback(() => {
    localStorage.removeItem('focustracker_session_start')
    localStorage.removeItem('focustracker_duration_ms')
    localStorage.removeItem('focustracker_paused_remaining')
    setIsRunning(false)
    setRemainingMs(durationMinutes * 60 * 1000)
  }, [durationMinutes])

  const pauseTimer = useCallback(() => {
    // Save remaining time and clear running state
    const storedStart = localStorage.getItem('focustracker_session_start')
    const storedDuration = localStorage.getItem('focustracker_duration_ms')
    if (storedStart && storedDuration) {
      const elapsed = Date.now() - parseInt(storedStart, 10)
      const remaining = Math.max(0, parseInt(storedDuration, 10) - elapsed)
      localStorage.setItem('focustracker_paused_remaining', remaining.toString())
      localStorage.removeItem('focustracker_session_start')
      localStorage.removeItem('focustracker_duration_ms')
      setRemainingMs(remaining)
    }
    setIsRunning(false)
  }, [])

  const resumeTimer = useCallback(() => {
    const pausedRemaining = localStorage.getItem('focustracker_paused_remaining')
    if (pausedRemaining) {
      const remaining = parseInt(pausedRemaining, 10)
      localStorage.setItem('focustracker_session_start', Date.now().toString())
      localStorage.setItem('focustracker_duration_ms', remaining.toString())
      localStorage.removeItem('focustracker_paused_remaining')
      setRemainingMs(remaining)
      setIsRunning(true)
    }
  }, [])

  // Check for persisted session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for paused state first
    const pausedRemaining = localStorage.getItem('focustracker_paused_remaining')
    if (pausedRemaining) {
      const remaining = parseInt(pausedRemaining, 10)
      if (remaining > 0) {
        setRemainingMs(remaining)
        // Stay paused - don't auto-resume
        return
      }
    }

    const storedStart = localStorage.getItem('focustracker_session_start')
    const storedDuration = localStorage.getItem('focustracker_duration_ms')

    if (storedStart && storedDuration) {
      const startTime = parseInt(storedStart, 10)
      const durationMs = parseInt(storedDuration, 10)
      const elapsed = Date.now() - startTime

      if (elapsed < durationMs) {
        // Use a microtask to avoid setState in effect warning
        queueMicrotask(() => {
          setIsRunning(true)
        })
      } else {
        localStorage.removeItem('focustracker_session_start')
        localStorage.removeItem('focustracker_duration_ms')
      }
    }
  }, [startTimer, stopTimer])

  // Main timer loop - doesn't count ticks, always calculates real time
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      const storedStart = localStorage.getItem('focustracker_session_start')
      const storedDuration = localStorage.getItem('focustracker_duration_ms')

      if (!storedStart || !storedDuration) {
        setIsRunning(false)
        return
      }

      const startTime = parseInt(storedStart, 10)
      const durationMs = parseInt(storedDuration, 10)
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, durationMs - elapsed)

      setRemainingMs(remaining)
      onTick?.(remaining)

      if (remaining <= 0) {
        localStorage.removeItem('focustracker_session_start')
        localStorage.removeItem('focustracker_duration_ms')
        setIsRunning(false)
        onComplete?.()
      }
    }, 100) // Update every 100ms for smooth display

    return () => clearInterval(interval)
  }, [isRunning, onComplete, onTick])

  const [isPaused, setIsPaused] = useState(false)

  // Sync isPaused state
  useEffect(() => {
    setIsPaused(!isRunning && !!localStorage.getItem('focustracker_paused_remaining'))
  }, [isRunning])

  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)

  return {
    minutes,
    seconds,
    remainingMs,
    isRunning,
    isPaused,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
  }
}

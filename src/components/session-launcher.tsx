'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PomodoroTimer from './pomodoro-timer'

interface SessionLauncherProps {
  taskId: string
}

type SessionState = 'idle' | 'running' | 'completed' | 'aborted'

export default function SessionLauncher({ taskId }: SessionLauncherProps) {
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [durationMinutes, setDurationMinutes] = useState('25')

  if (sessionState === 'running') {
    return (
      <PomodoroTimer
        taskId={taskId}
        durationMinutes={parseInt(durationMinutes)}
        onSessionEnd={(status) => {
          setSessionState(status === 'completed' ? 'completed' : 'aborted')
        }}
      />
    )
  }

  if (sessionState === 'completed') {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">✨</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Session Complete!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You finished a {durationMinutes} minute Pomodoro session. Great work!
          </p>
          <Button
            onClick={() => setSessionState('idle')}
            className="w-full"
          >
            Start Another Session
          </Button>
        </div>
      </Card>
    )
  }

  if (sessionState === 'aborted') {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">⏸️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Session Aborted
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your session was interrupted. You can start a new one anytime.
          </p>
          <Button
            onClick={() => setSessionState('idle')}
            className="w-full"
          >
            Start a New Session
          </Button>
        </div>
      </Card>
    )
  }

  // Idle state - show duration selector and start button
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label htmlFor="duration" className="text-sm font-medium">
            Session Duration
          </Label>
          <Select value={durationMinutes} onValueChange={setDurationMinutes}>
            <SelectTrigger id="duration" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes (Test)</SelectItem>
              <SelectItem value="25">25 minutes (Standard)</SelectItem>
              <SelectItem value="50">50 minutes (Extended)</SelectItem>
              <SelectItem value="90">90 minutes (Deep Focus)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setSessionState('running')}
          className="w-full h-12 text-lg font-semibold"
        >
          Start Session
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Tip: Press spacebar during the session to log a distraction
        </p>
      </div>
    </Card>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PeriodSelectorProps {
  currentPeriod: 7 | 30
}

export default function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const router = useRouter()

  return (
    <div className="flex gap-2">
      <Button
        variant={currentPeriod === 7 ? 'default' : 'outline'}
        onClick={() => router.push('/dashboard?period=7')}
      >
        Last 7 days
      </Button>
      <Button
        variant={currentPeriod === 30 ? 'default' : 'outline'}
        onClick={() => router.push('/dashboard?period=30')}
      >
        Last 30 days
      </Button>
    </div>
  )
}

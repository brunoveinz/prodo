'use client'

import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PeriodSelectorProps {
  currentPeriod: 7 | 30
}

export default function PeriodSelector({ currentPeriod }: PeriodSelectorProps) {
  const router = useRouter()

  return (
    <Tabs
      value={currentPeriod.toString()}
      onValueChange={(value: unknown) => router.push(`/dashboard?period=${value}`)}
    >
      <TabsList>
        <TabsTrigger value="7">Last 7 days</TabsTrigger>
        <TabsTrigger value="30">Last 30 days</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

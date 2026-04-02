import { Card } from '@/components/ui/card'
import { Zap } from 'lucide-react'

interface DistractionMetricProps {
  avgDistractions: number
}

export default function DistractionMetric({ avgDistractions }: DistractionMetricProps) {
  const level =
    avgDistractions <= 2 ? 'low' : avgDistractions <= 5 ? 'medium' : 'high'

  const statusColor = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-red-600 dark:text-red-400',
  }[level]

  const statusBg = {
    low: 'bg-green-500/10',
    medium: 'bg-yellow-500/10',
    high: 'bg-red-500/10',
  }[level]

  const statusLabel = {
    low: 'Excellent focus',
    medium: 'Good focus',
    high: 'Needs improvement',
  }[level]

  return (
    <Card className="p-6 relative overflow-hidden">
      {/* Decorative background circle */}
      <div
        className={`absolute -right-8 -top-8 size-32 rounded-full ${statusBg} opacity-60`}
      />

      <div className="relative space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="size-4" />
          <h3 className="text-sm font-medium">Focus Quality</h3>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold tracking-tight ${statusColor}`}>
            {avgDistractions.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">per session</span>
        </div>

        <div className="pt-3 border-t border-border">
          <p className={`text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Average distractions per session
          </p>
        </div>
      </div>
    </Card>
  )
}

import { Card } from '@/components/ui/card'

interface DistractionMetricProps {
  avgDistractions: number
}

export default function DistractionMetric({ avgDistractions }: DistractionMetricProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Focus Quality
      </h3>
      <div className="space-y-4">
        <div>
          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
            {avgDistractions.toFixed(1)}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Average distractions per session
          </p>
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {avgDistractions <= 2
              ? '✨ Excellent focus!'
              : avgDistractions <= 5
                ? '👍 Good focus'
                : '💡 Try reducing distractions'}
          </p>
        </div>
      </div>
    </Card>
  )
}

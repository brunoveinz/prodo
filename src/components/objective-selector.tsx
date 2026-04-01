import Link from 'next/link'
import { Objective } from '@/lib/types'
import { Card } from '@/components/ui/card'
import CreateObjectiveForm from './create-objective-form'

interface ObjectiveSelectorProps {
  objectives: Objective[]
  selectedId?: string
}

export default function ObjectiveSelector({
  objectives,
  selectedId,
}: ObjectiveSelectorProps) {
  return (
    <div className="space-y-4">
      {objectives.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No macro objectives yet. Create one to get started!
          </p>
          <CreateObjectiveForm />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {objectives.map((objective) => (
              <Link
                key={objective.id}
                href={`/?objective=${objective.id}`}
                className={`block p-4 rounded-lg border-2 transition-all ${
                  selectedId === objective.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: objective.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {objective.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {objective.status}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <CreateObjectiveForm />
        </>
      )}
    </div>
  )
}

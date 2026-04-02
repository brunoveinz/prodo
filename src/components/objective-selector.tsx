import Link from 'next/link'
import { Objective } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, ChevronRight } from 'lucide-react'
import CreateObjectiveForm from './create-objective-form'

interface ObjectiveSelectorProps {
  objectives: Objective[]
  selectedId?: string
}

export default function ObjectiveSelector({
  objectives,
  selectedId,
}: ObjectiveSelectorProps) {
  if (objectives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No objectives yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Create your first macro objective to start tracking your productivity.
          </p>
        </div>
        <CreateObjectiveForm />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {objectives.map((objective) => {
          const isSelected = selectedId === objective.id
          return (
            <Link key={objective.id} href={`/?objective=${objective.id}`}>
              <div
                className={`group relative flex items-center justify-between p-2.5 pr-4 transition-all duration-200 cursor-pointer rounded-xl border ${
                  isSelected
                    ? 'border-transparent shadow-[0_4px_15px_-5px_rgba(0,0,0,0.3)]'
                    : 'border-border/30 bg-card/20 hover:bg-secondary/20 hover:border-border/60'
                }`}
                style={isSelected ? { backgroundColor: `${objective.color}15`, borderColor: `${objective.color}30` } : {}}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isSelected ? objective.color : `${objective.color}20`,
                    }}
                  >
                    <Target
                      className="h-3 w-3"
                      style={{ color: isSelected ? '#fff' : objective.color }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold truncate text-[13px] ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`}>
                      {objective.name}
                    </h3>
                  </div>
                </div>
                <ChevronRight
                  className={`h-3 w-3 shrink-0 transition-transform duration-300 ${
                    isSelected
                      ? 'translate-x-1'
                      : 'text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5'
                  }`}
                  style={isSelected ? { color: objective.color } : {}}
                />
              </div>
            </Link>
          )
        })}

        {/* New objective trigger card */}
        <CreateObjectiveForm />
      </div>
    </div>
  )
}

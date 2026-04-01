import Link from 'next/link'
import { Objective, Task } from '@/lib/types'
import { Card } from '@/components/ui/card'
import CreateTaskForm from './create-task-form'
import SessionLauncher from './session-launcher'

interface TaskSelectorProps {
  objectives: Objective[]
  objectiveId: string
  tasks: Task[]
  selectedTaskId?: string
}

export default function TaskSelector({
  objectives,
  objectiveId,
  tasks,
  selectedTaskId,
}: TaskSelectorProps) {
  const objective = objectives.find((o) => o.id === objectiveId)

  if (!objective) {
    return <div>Objective not found</div>
  }

  return (
    <div className="space-y-4">
      {selectedTaskId ? (
        <div className="space-y-4">
          <SessionLauncher taskId={selectedTaskId} />
        </div>
      ) : (
        <>
          {tasks.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No tasks yet. Create one to start focusing!
              </p>
            </Card>
          ) : (
            <div className="space-y-3 mb-6">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/?objective=${objectiveId}&task=${task.id}`}
                  className="block p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      readOnly
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${
                          task.isCompleted
                            ? 'line-through text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <CreateTaskForm objectiveId={objectiveId} />
        </>
      )}
    </div>
  )
}

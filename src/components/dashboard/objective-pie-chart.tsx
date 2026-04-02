'use client'

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Target } from 'lucide-react'

interface ObjectivePieChartProps {
  data: Array<{
    name: string
    color: string
    hours: number
  }>
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="text-xs text-muted-foreground">{item.name}</span>
      </div>
      <p className="text-sm font-semibold text-foreground mt-0.5">
        {item.value.toFixed(1)}h
      </p>
    </div>
  )
}

export default function ObjectivePieChart({ data }: ObjectivePieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Target className="size-10 opacity-40" />
        <p className="text-sm">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="hours"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={60}
          paddingAngle={3}
          strokeWidth={0}
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-sm text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

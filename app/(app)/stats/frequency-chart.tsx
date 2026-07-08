'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type Point = {
  week_start_iso: string
  is_current_week: boolean
  workout_count: number
}

type ChartPoint = Point & { label: string }

export default function FrequencyChart({ data }: { data: Point[] }) {
  const [chartData, setChartData] = useState<ChartPoint[] | null>(null)

  useEffect(() => {
    setChartData(
      data.map((p) => ({
        ...p,
        label: p.is_current_week
          ? 'This wk'
          : new Date(p.week_start_iso).toLocaleDateString(undefined, {
              month: 'numeric',
              day: 'numeric',
            }),
      }))
    )
  }, [data])

  if (!chartData) {
    return <div style={{ width: '100%', height: 180 }} />
  }

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #1f2937',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#fff' }}
            cursor={{ fill: 'rgba(91,91,214,0.08)' }}
          />
          <Bar dataKey="workout_count" fill="#5B5BD6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
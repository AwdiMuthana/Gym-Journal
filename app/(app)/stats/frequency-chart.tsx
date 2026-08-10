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
          <CartesianGrid strokeDasharray="2 3" stroke="#444141" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9b9797', fontSize: 10, fontWeight: 800 }}
            axisLine={{ stroke: '#444141' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9b9797', fontSize: 10, fontWeight: 800 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#201e1d',
              border: '2px solid #605d5d',
              borderRadius: 0,
              fontSize: 12,
            }}
            labelStyle={{ color: '#9b9797' }}
            itemStyle={{ color: '#f3f2f2' }}
            cursor={{ fill: 'rgba(236,48,19,0.1)' }}
          />
          <Bar dataKey="workout_count" fill="#ec3013" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
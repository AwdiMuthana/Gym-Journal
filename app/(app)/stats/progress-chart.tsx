'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'

type Point = {
  date: string
  performed_at_label: string
  top_weight: number | null
  est_1rm: number | null
  volume: number
}

export default function ProgressChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No logged sets yet for this exercise.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="2 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="performed_at_label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
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
            cursor={{ stroke: '#5B5BD6', strokeWidth: 1, strokeDasharray: '2 2' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
            iconType="circle"
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="top_weight"
            name="Top weight"
            stroke="#5B5BD6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#5B5BD6' }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="est_1rm"
            name="Est. 1RM"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2, fill: '#10b981' }}
          />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
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
      <div className="py-8 text-center text-sm text-neutral-500">
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
          <CartesianGrid strokeDasharray="2 3" stroke="#444141" vertical={false} />
          <XAxis
            dataKey="performed_at_label"
            tick={{ fill: '#9b9797', fontSize: 10, fontWeight: 800 }}
            axisLine={{ stroke: '#444141' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="weight"
            tick={{ fill: '#9b9797', fontSize: 10, fontWeight: 800 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tick={{ fill: '#9b9797', fontSize: 10, fontWeight: 800 }}
            axisLine={false}
            tickLine={false}
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
            cursor={{ stroke: '#ec3013', strokeWidth: 1, strokeDasharray: '2 2' }}
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
            stroke="#ec3013"
            strokeWidth={2}
            dot={{ r: 3, fill: '#ec3013' }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="est_1rm"
            name="Est. 1RM"
            stroke="#f3f2f2"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2, fill: '#f3f2f2' }}
          />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke="#9b9797"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
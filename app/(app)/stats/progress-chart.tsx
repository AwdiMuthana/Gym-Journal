'use client'

import { useEffect, useState } from 'react'
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
import {
  UNITS_STORAGE_KEY,
  readStoredUnits,
  toDisplayNumber,
  unitLabel,
  volumeToDisplayNumber,
  type UnitSystem,
} from '@/lib/units'

type Point = {
  date: string
  performed_at_label: string
  top_weight: number | null
  est_1rm: number | null
  volume: number
}

type ChartPoint = {
  performed_at_label: string
  top_weight: number | null
  est_1rm: number | null
  volume: number
}

export default function ProgressChart({ data }: { data: Point[] }) {
  const [unit, setUnit] = useState<UnitSystem>('lbs')
  const [chartData, setChartData] = useState<ChartPoint[] | null>(null)

  useEffect(() => {
    function sync() {
      const u = readStoredUnits()
      setUnit(u)
      setChartData(
        data.map((p) => ({
          performed_at_label: p.performed_at_label,
          top_weight: p.top_weight === null ? null : toDisplayNumber(p.top_weight, u),
          est_1rm: p.est_1rm === null ? null : toDisplayNumber(p.est_1rm, u),
          volume: volumeToDisplayNumber(p.volume, u),
        }))
      )
    }
    sync()
    function onStorage(e: StorageEvent) {
      if (e.key === UNITS_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [data])

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">
        No logged sets yet for this exercise.
      </div>
    )
  }

  if (!chartData) {
    return <div style={{ width: '100%', height: 220 }} />
  }

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
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
            name={`Top weight (${unitLabel(unit)})`}
            stroke="#ec3013"
            strokeWidth={2}
            dot={{ r: 3, fill: '#ec3013' }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="est_1rm"
            name={`Est. 1RM (${unitLabel(unit)})`}
            stroke="#f3f2f2"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2, fill: '#f3f2f2' }}
          />
          <Line
            yAxisId="volume"
            type="monotone"
            dataKey="volume"
            name={`Volume (${unitLabel(unit)})`}
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
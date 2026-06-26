import Link from 'next/link'
import { getSessionsList } from '@/lib/db'

function fmtFullDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (diffDays === 0) return `Today · ${time}`
  if (diffDays === 1) return `Yesterday · ${time}`
  if (diffDays < 7)
    return `${d.toLocaleDateString(undefined, { weekday: 'long' })} · ${time}`
  return `${d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })} · ${time}`
}

export default async function HistoryPage() {
  const sessions = await getSessionsList()

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
        <p className="text-gray-400">No workouts logged yet.</p>
        <p className="mt-1 mb-4 text-xs text-gray-500">
          Log a workout from the Log tab and it&apos;ll show up here.
        </p>
        <Link
          href="/log"
          className="inline-block rounded-md bg-[#5B5BD6] px-4 py-2 text-sm font-medium text-white"
        >
          Go to Log
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">History</h2>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/history/${s.id}`}
            className="block rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 hover:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.day_name ?? 'Workout'}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {fmtFullDate(s.performed_at)}
                  {s.plan_name && <> · {s.plan_name}</>}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {s.total_sets} set{s.total_sets === 1 ? '' : 's'}
                </span>
                <span className="text-gray-500">›</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
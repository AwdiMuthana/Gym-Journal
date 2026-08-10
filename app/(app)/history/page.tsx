import Link from 'next/link'
import { getSessionsList } from '@/lib/db'
import LocalDateTime from '../local-date-time'

export default async function HistoryPage() {
  const sessions = await getSessionsList()

  if (sessions.length === 0) {
    return (
      <div className="border-2 border-neutral-700 py-12 text-center">
        <p className="text-neutral-400">No workouts logged yet.</p>
        <p className="mt-1 mb-4 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          Log a workout from the Log tab and it&apos;ll show up here.
        </p>
        <Link
          href="/log"
          className="inline-block bg-accent px-4 py-2 text-sm font-black uppercase tracking-wide text-bg"
        >
          Go to Log
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase tracking-tight">History</h2>
      <div className="divide-y-2 divide-neutral-800 border-2 border-neutral-700">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/history/${s.id}`}
            className="block px-4 py-3 hover:bg-neutral-900"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-bold uppercase tracking-tight">{s.day_name ?? 'Workout'}</p>
                <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
                  <LocalDateTime iso={s.performed_at} variant="relative" />
                  {s.plan_name && <> · {s.plan_name}</>}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <span className="text-xs font-semibold tabular-nums text-neutral-500">
                  {s.total_sets} set{s.total_sets === 1 ? '' : 's'}
                </span>
                <span className="text-neutral-500">›</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
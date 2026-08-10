import Link from 'next/link'
import { getPlansWithSessions } from '@/lib/db'

export default async function LogPage() {
  const plans = await getPlansWithSessions()
  const totalDays = plans.reduce((sum, p) => sum + p.days.length, 0)

  if (totalDays === 0) {
    return (
      <div className="border-2 border-neutral-700 py-12 text-center">
        <p className="text-neutral-400">No sessions set up yet.</p>
        <p className="mt-1 mb-4 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          Create a plan with sessions and exercises first.
        </p>
        <Link
          href="/plan"
          className="inline-block bg-accent px-4 py-2 text-sm font-black uppercase tracking-wide text-bg"
        >
          Go to Plan
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tight">What are you training today?</h2>

      {plans.map((plan) => (
        <div key={plan.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
              {plan.name}
            </h3>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-600">
              {plan.days.length} session{plan.days.length === 1 ? '' : 's'}
            </span>
          </div>
          {plan.days.length === 0 ? (
            <div className="border-2 border-neutral-700 px-4 py-3 text-xs text-neutral-500">
              No sessions in this plan yet.{' '}
              <Link
                href={`/plan/${plan.id}`}
                className="text-accent hover:underline"
              >
                Add one
              </Link>
            </div>
          ) : (
            <div className="divide-y-2 divide-neutral-800 border-2 border-neutral-700">
              {plan.days.map((day) => (
                <Link
                  key={day.id}
                  href={`/log/${day.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-900"
                >
                  <span className="font-bold uppercase tracking-tight">{day.name}</span>
                  <span className="text-neutral-500">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
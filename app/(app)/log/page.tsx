import Link from 'next/link'
import { getPlansWithSessions } from '@/lib/db'

export default async function LogPage() {
  const plans = await getPlansWithSessions()
  const totalDays = plans.reduce((sum, p) => sum + p.days.length, 0)

  if (totalDays === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
        <p className="text-gray-400">No sessions set up yet.</p>
        <p className="mt-1 mb-4 text-xs text-gray-500">
          Create a plan with sessions and exercises first.
        </p>
        <Link
          href="/plan"
          className="inline-block rounded-md bg-[#5B5BD6] px-4 py-2 text-sm font-medium text-white"
        >
          Go to Plan
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">What are you training today?</h2>

      {plans.map((plan) => (
        <div key={plan.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-gray-500">
              {plan.name}
            </h3>
            <span className="text-xs text-gray-600">
              {plan.days.length} session{plan.days.length === 1 ? '' : 's'}
            </span>
          </div>
          {plan.days.length === 0 ? (
            <div className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-xs text-gray-500">
              No sessions in this plan yet.{' '}
              <Link
                href={`/plan/${plan.id}`}
                className="text-[#5B5BD6] hover:underline"
              >
                Add one
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {plan.days.map((day) => (
                <Link
                  key={day.id}
                  href={`/log/${day.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 hover:bg-gray-900"
                >
                  <span className="font-medium">{day.name}</span>
                  <span className="text-gray-500">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
import Link from 'next/link'
import { getAllDaysForUser } from '@/lib/db'

export default async function LogPage() {
  const days = await getAllDaysForUser()

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
        <p className="text-gray-400">No days set up yet.</p>
        <p className="mt-1 text-xs text-gray-500 mb-4">
          Create a plan with days and exercises first.
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Which day are you doing?</h2>
      <div className="space-y-2">
        {days.map((day) => (
          <Link
            key={day.id}
            href={`/log/${day.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 hover:bg-gray-900"
          >
            <div>
              <p className="font-medium">{day.name}</p>
              <p className="text-xs text-gray-500">{day.plan_name}</p>
            </div>
            <span className="text-gray-500">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
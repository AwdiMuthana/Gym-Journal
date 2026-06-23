import Link from 'next/link'
import { getPlans } from '@/lib/db'
import { createPlan } from '@/app/plan-actions'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const params = await searchParams
  const plans = await getPlans()
  const newOpen = params.new === '1'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your plans</h2>
        {!newOpen && (
          <Link
            href="/plan?new=1"
            className="rounded-md bg-[#5B5BD6] px-3 py-1.5 text-sm font-medium text-white"
          >
            + New plan
          </Link>
        )}
      </div>

      {newOpen && (
        <form action={createPlan} className="rounded-lg border border-gray-800 bg-gray-950 p-4 space-y-2">
          <input
            type="text"
            name="name"
            placeholder='Plan name (e.g. "Push Pull Legs")'
            required
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
            >
              Create
            </button>
            <Link
              href="/plan"
              className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {plans.length === 0 && !newOpen && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
          <p className="text-gray-400">No plans yet.</p>
          <p className="mt-1 text-xs text-gray-500">Create one to start building your split.</p>
        </div>
      )}

      <div className="space-y-2">
        {plans.map((plan) => (
          <Link
            key={plan.id}
            href={`/plan/${plan.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 hover:bg-gray-900"
          >
            <span className="font-medium">{plan.name}</span>
            <span className="text-gray-500">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
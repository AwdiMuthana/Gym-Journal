import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlanWithDays } from '@/lib/db'
import { createDay, deletePlan, deleteDay } from '@/app/plan-actions'

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{
    newDay?: string
    confirmDelete?: string
    confirmDeleteDay?: string
  }>
}) {
  const { planId } = await params
  const sp = await searchParams
  const plan = await getPlanWithDays(planId)
  if (!plan) notFound()

  const newDayOpen = sp.newDay === '1'
  const confirmDeletePlan = sp.confirmDelete === '1'
  const confirmDeleteDayId = sp.confirmDeleteDay

  return (
    <div className="space-y-4">
      <div>
        <Link href="/plan" className="text-sm text-gray-400 hover:text-white">
          ← All plans
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{plan.name}</h2>
        {!newDayOpen && (
          <Link
            href={`/plan/${plan.id}?newDay=1`}
            className="rounded-md bg-[#5B5BD6] px-3 py-1.5 text-sm font-medium text-white"
          >
            + Day
          </Link>
        )}
      </div>

      {newDayOpen && (
        <form
          action={createDay}
          className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-4"
        >
          <input type="hidden" name="planId" value={plan.id} />
          <input
            type="text"
            name="name"
            placeholder='Day name (e.g. "Push" or "Legs")'
            required
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
            >
              Add day
            </button>
            <Link
              href={`/plan/${plan.id}`}
              className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {plan.days.length === 0 && !newDayOpen && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-12 text-center">
          <p className="text-gray-400">No days yet.</p>
          <p className="mt-1 text-xs text-gray-500">
            Add a day like &quot;Push&quot; or &quot;Legs&quot;.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {plan.days.map((day) => (
          <div
            key={day.id}
            className="rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <Link href={`/plan/${plan.id}/days/${day.id}`} className="flex-1">
                <p className="font-medium">{day.name}</p>
                <p className="text-xs text-gray-500">
                  {day.exercises.length} exercise
                  {day.exercises.length === 1 ? '' : 's'}
                </p>
              </Link>
              {confirmDeleteDayId === day.id ? (
                <form action={deleteDay} className="flex items-center gap-2">
                  <input type="hidden" name="dayId" value={day.id} />
                  <input type="hidden" name="planId" value={plan.id} />
                  <button
                    type="submit"
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                  >
                    Delete
                  </button>
                  <Link
                    href={`/plan/${plan.id}`}
                    className="rounded border border-gray-700 px-2 py-1 text-xs"
                  >
                    Cancel
                  </Link>
                </form>
              ) : (
                <Link
                  href={`/plan/${plan.id}?confirmDeleteDay=${day.id}`}
                  className="ml-3 text-xs text-gray-500 hover:text-red-400"
                >
                  Delete
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete plan section at bottom */}
      <div className="mt-12 border-t border-gray-800 pt-6">
        {confirmDeletePlan ? (
          <div className="space-y-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm">
              Delete <strong>{plan.name}</strong> and all its days, exercises,
              and workout history? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <form action={deletePlan} className="flex-1">
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Yes, delete plan
                </button>
              </form>
              <Link
                href={`/plan/${plan.id}`}
                className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
              >
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/plan/${plan.id}?confirmDelete=1`}
            className="block w-full rounded-md border border-red-900 px-4 py-2.5 text-center text-sm text-red-400 hover:bg-red-950/30"
          >
            Delete this plan
          </Link>
        )}
      </div>
    </div>
  )
}
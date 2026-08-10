import Link from 'next/link'
import { getPlans } from '@/lib/db'
import { createPlan, updatePlan } from '@/app/plan-actions'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; rename?: string }>
}) {
  const params = await searchParams
  const plans = await getPlans()
  const newOpen = params.new === '1'
  const renameId = params.rename

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight">Your plans</h2>
        {!newOpen && (
          <Link
            href="/plan?new=1"
            className="bg-accent px-3 py-1.5 text-sm font-black uppercase tracking-wide text-bg"
          >
            + New plan
          </Link>
        )}
      </div>

      {newOpen && (
        <form
          action={createPlan}
          className="space-y-2 border-2 border-neutral-700 p-4"
        >
          <input
            type="text"
            name="name"
            placeholder='Plan name (e.g. "Push Pull Legs")'
            required
            autoFocus
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
            >
              Create
            </button>
            <Link
              href="/plan"
              className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {plans.length === 0 && !newOpen && (
        <div className="border-2 border-neutral-700 py-12 text-center">
          <p className="text-neutral-400">No plans yet.</p>
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
            Create one to start building your split.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {plans.map((plan) => {
          const isRenaming = renameId === plan.id
          return (
            <div
              key={plan.id}
              className="border-2 border-neutral-700"
            >
              {isRenaming ? (
                <form action={updatePlan} className="space-y-2 p-3">
                  <input type="hidden" name="planId" value={plan.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={plan.name}
                    required
                    autoFocus
                    className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg focus-visible:border-accent focus-visible:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
                    >
                      Save
                    </button>
                    <Link
                      href="/plan"
                      className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between px-4 py-3">
                  <Link href={`/plan/${plan.id}`} className="flex-1 font-bold uppercase tracking-tight">
                    {plan.name}
                  </Link>
                  <div className="ml-3 flex items-center gap-3">
                    <Link
                      href={`/plan?rename=${plan.id}`}
                      className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                    >
                      Rename
                    </Link>
                    <Link
                      href={`/plan/${plan.id}`}
                      className="text-neutral-500"
                      aria-label="Open plan"
                    >
                      ›
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
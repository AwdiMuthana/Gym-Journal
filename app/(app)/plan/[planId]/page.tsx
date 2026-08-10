import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlanWithDays } from '@/lib/db'
import {
  createDay,
  deletePlan,
  deleteDay,
  updatePlan,
  updateDay,
} from '@/app/plan-actions'

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{
    newDay?: string
    confirmDelete?: string
    confirmDeleteDay?: string
    renamePlan?: string
    renameDay?: string
  }>
}) {
  const { planId } = await params
  const sp = await searchParams
  const plan = await getPlanWithDays(planId)
  if (!plan) notFound()

  const newDayOpen = sp.newDay === '1'
  const confirmDeletePlan = sp.confirmDelete === '1'
  const confirmDeleteDayId = sp.confirmDeleteDay
  const renamePlanOpen = sp.renamePlan === '1'
  const renameDayId = sp.renameDay

  return (
    <div className="space-y-4">
      <div>
        <Link href="/plan" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← All plans
        </Link>
      </div>

      {renamePlanOpen ? (
        <form
          action={updatePlan}
          className="space-y-2 border-2 border-neutral-700 p-4"
        >
          <input type="hidden" name="planId" value={plan.id} />
          <input
            type="text"
            name="name"
            defaultValue={plan.name}
            required
            autoFocus
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-lg text-bg focus-visible:border-accent focus-visible:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
            >
              Save
            </button>
            <Link
              href={`/plan/${plan.id}`}
              className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-black uppercase tracking-tight">{plan.name}</h2>
            <Link
              href={`/plan/${plan.id}?renamePlan=1`}
              className="mt-1 inline-block text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
            >
              Rename
            </Link>
          </div>
          {!newDayOpen && (
            <Link
              href={`/plan/${plan.id}?newDay=1`}
              className="shrink-0 bg-accent px-3 py-1.5 text-sm font-black uppercase tracking-wide text-bg"
            >
              + Session
            </Link>
          )}
        </div>
      )}

      {newDayOpen && (
        <form
          action={createDay}
          className="space-y-2 border-2 border-neutral-700 p-4"
        >
          <input type="hidden" name="planId" value={plan.id} />
          <input
            type="text"
            name="name"
            placeholder='Session name (e.g. "Push" or "Legs")'
            required
            autoFocus
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
          />
          <p className="text-[11px] text-neutral-500">
            A session is one workout within your plan, not a day of the week.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
            >
              Add session
            </button>
            <Link
              href={`/plan/${plan.id}`}
              className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {plan.days.length === 0 && !newDayOpen && (
        <div className="border-2 border-neutral-700 py-12 text-center">
          <p className="text-neutral-400">No sessions yet.</p>
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
            Add a session like &quot;Push&quot; or &quot;Legs&quot;.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {plan.days.map((day) => {
          const isRenaming = renameDayId === day.id
          if (isRenaming) {
            return (
              <form
                key={day.id}
                action={updateDay}
                className="space-y-2 border-2 border-neutral-700 p-3"
              >
                <input type="hidden" name="dayId" value={day.id} />
                <input type="hidden" name="planId" value={plan.id} />
                <input
                  type="text"
                  name="name"
                  defaultValue={day.name}
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
                    href={`/plan/${plan.id}`}
                    className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            )
          }
          return (
            <div
              key={day.id}
              className="border-2 border-neutral-700 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/plan/${plan.id}/days/${day.id}`}
                  className="flex-1"
                >
                  <p className="font-bold uppercase tracking-tight">{day.name}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
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
                      className="bg-accent-700 px-2 py-1 text-xs font-black uppercase tracking-wide text-bg"
                    >
                      Delete
                    </button>
                    <Link
                      href={`/plan/${plan.id}`}
                      className="border-2 border-neutral-700 px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-bg"
                    >
                      Cancel
                    </Link>
                  </form>
                ) : (
                  <div className="ml-3 flex items-center gap-3">
                    <Link
                      href={`/plan/${plan.id}?renameDay=${day.id}`}
                      className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                    >
                      Rename
                    </Link>
                    <Link
                      href={`/plan/${plan.id}?confirmDeleteDay=${day.id}`}
                      className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                    >
                      Delete
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-12 border-t-2 border-neutral-800 pt-6">
        {confirmDeletePlan ? (
          <div className="space-y-3 border-2 border-accent-700 p-4">
            <p className="text-sm">
              Delete <strong>{plan.name}</strong> and all its sessions,
              exercises, and workout history? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <form action={deletePlan} className="flex-1">
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  type="submit"
                  className="w-full bg-accent-700 px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
                >
                  Yes, delete plan
                </button>
              </form>
              <Link
                href={`/plan/${plan.id}`}
                className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
              >
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/plan/${plan.id}?confirmDelete=1`}
            className="block w-full border-2 border-accent-800 px-4 py-2.5 text-center text-sm font-extrabold uppercase tracking-wide text-accent-500 hover:bg-accent-900/20"
          >
            Delete this plan
          </Link>
        )}
      </div>
    </div>
  )
}
import Link from 'next/link'
import { getTraining } from '@/lib/board'
import { createPlan } from '@/app/plan-actions'
import { ScreenTitle } from '../board-ui'

const pad = (n: number) => String(n).padStart(2, '0')

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; day?: string }>
}) {
  const params = await searchParams
  const training = await getTraining()
  const newOpen = params.new === '1'
  const plan = training.activePlan
  const others = training.plans.filter((p) => p.id !== plan?.id)
  const selectedIdx = plan ? Math.max(0, plan.days.findIndex((d) => d.id === params.day)) : 0
  const selected = plan?.days[selectedIdx] ?? null
  const exerciseCount = plan?.days.reduce((sum, d) => sum + d.exercises.length, 0) ?? 0

  return (
    <div>
      <ScreenTitle
        title="Plans"
        action={
          !newOpen && (
            <Link href="/plan?new=1" className="btn-primary shrink-0 px-[13px] py-2.5 text-[11px] font-extrabold tracking-[0.08em] uppercase">
              + New
            </Link>
          )
        }
      />

      {newOpen && (
        <form action={createPlan} className="mt-[18px] space-y-0.5">
          <label className="k mb-2.5 block text-neutral-500" htmlFor="plan-name">
            New plan
          </label>
          <input
            id="plan-name"
            type="text"
            name="name"
            placeholder='e.g. "Push Pull Legs"'
            required
            autoFocus
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-3 text-[15px] font-bold text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
          />
          <div className="grid grid-cols-2 gap-0.5">
            <button type="submit" className="btn-primary px-3 py-3 text-left text-xs font-extrabold tracking-[0.06em] uppercase">
              Create →
            </button>
            <Link href="/plan" className="btn-outline px-3 py-3 text-left text-xs font-extrabold tracking-[0.06em] text-bg uppercase">
              Cancel
            </Link>
          </div>
        </form>
      )}

      {!plan && !newOpen && (
        <div className="mt-[18px]">
          <p className="text-[15px] leading-[1.5] font-medium text-neutral-500">
            No plans yet. A plan is your split: the days you rotate through and what you do on each.
          </p>
          <Link href="/plan?new=1" className="btn-primary mt-4 block px-[18px] py-[22px] text-left text-[17px] font-black tracking-[0.02em] uppercase">
            Build your first plan →
          </Link>
        </div>
      )}

      {plan && (
        <div className="md:grid md:grid-cols-[1fr_1fr] md:gap-10">
          <section className="pt-[18px]">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/plan/${plan.id}`} className="min-w-0 text-[21px] font-black tracking-[-0.02em] uppercase hover:text-accent">
                {plan.name}
              </Link>
              <span className="k shrink-0 text-accent">Active</span>
            </div>
            <div className="k mt-[5px] text-neutral-500">
              {plan.days.length} session{plan.days.length === 1 ? '' : 's'} · {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'}
            </div>
            <div className="mt-3.5 grid grid-cols-4 gap-0.5">
              {plan.days.map((d, i) => {
                const on = i === selectedIdx
                return (
                  <Link
                    key={d.id}
                    href={`/plan?day=${d.id}`}
                    scroll={false}
                    aria-current={on ? 'true' : undefined}
                    className={`min-w-0 border-2 px-2 py-[11px] ${on ? 'border-bg bg-bg text-ink' : 'border-neutral-700 hover:bg-bg/[0.07]'}`}
                  >
                    <div className="num text-lg font-black">{pad(i + 1)}</div>
                    <div className={`k mt-[5px] truncate ${on ? '' : 'text-neutral-500'}`}>{d.name}</div>
                  </Link>
                )
              })}
              <Link
                href={`/plan/${plan.id}?newDay=1`}
                className="flex min-h-[64px] items-center border-2 border-dashed border-neutral-700 px-2 py-[11px] text-neutral-500 hover:text-bg"
              >
                <span className="k">+ Day</span>
              </Link>
            </div>
          </section>

          {selected && (
            <section className="mt-5 border-t-2 border-neutral-700 pt-3 md:mt-[18px]">
              <div className="flex items-baseline justify-between gap-3">
                <div className="k text-neutral-500">
                  Day {pad(selectedIdx + 1)} · {selected.name}
                </div>
                <Link href={`/plan/${plan.id}/days/${selected.id}`} className="k text-neutral-500 hover:text-bg">
                  Edit
                </Link>
              </div>
              {selected.exercises.map((ex, i) => (
                <Link
                  key={ex.id}
                  href={`/plan/${plan.id}/days/${selected.id}?editEx=${ex.id}`}
                  className={`flex items-baseline justify-between gap-3 py-3 hover:text-accent ${
                    i === selected.exercises.length - 1 ? 'border-b-2 border-neutral-700' : 'border-b border-neutral-800'
                  }`}
                >
                  <span className="min-w-0 truncate text-[15px] font-bold">{ex.name}</span>
                  <span className="num shrink-0 text-sm font-bold text-neutral-500">
                    {ex.target_sets} × {ex.target_reps}
                  </span>
                </Link>
              ))}
              {selected.exercises.length === 0 && (
                <p className="border-b-2 border-neutral-700 py-3 text-sm font-medium text-neutral-500">No exercises yet.</p>
              )}
              <Link
                href={`/plan/${plan.id}/days/${selected.id}`}
                className="mt-3.5 block border-2 border-dashed border-neutral-700 p-[13px] text-left text-xs font-extrabold tracking-[0.06em] text-neutral-500 uppercase hover:text-bg"
              >
                + Add exercise
              </Link>
            </section>
          )}
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-8 border-t-2 border-neutral-700 pt-3">
          <div className="k text-neutral-500">Other plans</div>
          {others.map((p) => (
            <Link
              key={p.id}
              href={`/plan/${p.id}`}
              className="flex items-baseline justify-between gap-3 border-b border-neutral-800 py-3 hover:text-accent"
            >
              <span className="min-w-0 truncate text-[15px] font-bold uppercase">{p.name}</span>
              <span className="k shrink-0 text-neutral-500">
                {p.days.length} session{p.days.length === 1 ? '' : 's'}
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

import Link from 'next/link'
import { getPRs } from '@/lib/db'
import { daysSinceTrained, getLastTopSets, getTraining, nextDay, trainingWeek, weeklyBoard } from '@/lib/board'
import { EmptyBoard, RecordsList, StreakBlock, WeekBars } from '../board-ui'
import HeaderMeta from '../header-meta'
import { Weight } from '../weight'

// Rough session length: ~40s under the bar plus the default 2:00 rest per set.
const SECONDS_PER_SET = 160

const pad = (n: number) => String(n).padStart(2, '0')

export default async function LogPage() {
  const training = await getTraining()
  const today = nextDay(training)

  if (!today) {
    const plan = training.plans[0]
    return <EmptyBoard href={plan ? `/plan/${plan.id}?newDay=1` : '/plan?new=1'} />
  }

  const plan = training.activePlan!
  const [lastSets, records] = await Promise.all([
    getLastTopSets(today.exercises.map((ex) => ex.id)),
    getPRs(),
  ])
  const board = weeklyBoard(training)

  const plannedSets = today.exercises.reduce((sum, ex) => sum + ex.target_sets, 0)
  const minutes = Math.round((plannedSets * SECONDS_PER_SET) / 60)
  const dayNumber = plan.days.findIndex((d) => d.id === today.id) + 1
  const weekLabel = `Week ${pad(trainingWeek(training))} · Day ${dayNumber} of ${plan.days.length}`
  const meta = `${today.exercises.length} exercise${today.exercises.length === 1 ? '' : 's'} · ${plannedSets} sets planned · ~${minutes} min`

  const others = training.plans
    .flatMap((p) => p.days)
    .filter((d) => d.id !== today.id)

  function lastLabel(exerciseId: string) {
    const top = lastSets.get(exerciseId)
    if (!top || top.weight === null) return null
    return (
      <>
        <Weight lbs={top.weight} suffix={false} /> × {top.reps ?? '–'} last
      </>
    )
  }

  const preview = today.exercises.slice(0, 3)
  const moreCount = today.exercises.length - preview.length

  return (
    <div className="md:-mx-7 md:-mt-6 md:grid md:grid-cols-[1.35fr_1fr]">
      <HeaderMeta>{weekLabel}</HeaderMeta>

      <section className="md:border-r-2 md:border-neutral-700 md:px-7 md:py-10">
        <div className="pt-0.5">
          <div className="k text-accent">
            Today<span className="hidden md:inline"> · {weekLabel}</span>
          </div>
          <h2 className="mt-2.5 text-[84px] leading-[0.82] font-black tracking-[-0.05em] break-words uppercase md:mt-3.5 md:text-[128px] md:tracking-[-0.055em]">
            {today.name}
          </h2>
          <div className="k mt-3.5 text-neutral-500 md:mt-[18px]">{meta}</div>
        </div>

        {/* Mobile: first three exercises, then the CTA. */}
        {today.exercises.length > 0 && (
          <div className="mt-[22px] border-y-2 border-neutral-700 md:hidden">
            {preview.map((ex, i) => (
              <div key={ex.id} className={`flex items-baseline justify-between gap-3 py-[11px] ${i > 0 ? 'border-t border-neutral-800' : ''}`}>
                <span className="min-w-0 truncate text-[15px] font-bold">{ex.name}</span>
                <span className="num shrink-0 text-sm font-bold text-neutral-500">{lastLabel(ex.id)}</span>
              </div>
            ))}
            {moreCount > 0 && (
              <div className="border-t border-neutral-800 py-[11px] text-sm font-medium text-neutral-500">+ {moreCount} more</div>
            )}
          </div>
        )}

        <Link
          href={`/log/${today.id}`}
          className="btn-primary mt-4 block w-full px-[18px] py-[22px] text-left text-lg font-black tracking-[0.02em] uppercase md:mt-[26px] md:inline-block md:w-auto md:px-[26px] md:text-xl"
        >
          Start {today.name} →
        </Link>

        {/* Desktop: the full list with last time and target. */}
        {today.exercises.length > 0 && (
          <div className="mt-8 hidden border-t-2 border-neutral-700 md:block">
            {today.exercises.map((ex, i) => (
              <div
                key={ex.id}
                className={`flex items-baseline justify-between gap-3 py-3 ${i === today.exercises.length - 1 ? 'border-b-2 border-neutral-700' : 'border-b border-neutral-800'}`}
              >
                <span className="text-[15px] font-bold">{ex.name}</span>
                <span className="num text-sm font-bold text-neutral-500">
                  {lastLabel(ex.id)}
                  {lastLabel(ex.id) && ' · '}target {ex.target_sets} × {ex.target_reps}
                </span>
              </div>
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-[18px] border-t-2 border-neutral-700 pt-3 md:mt-8">
            <div className="k mb-2.5 text-neutral-500">Or train something else</div>
            <div className="grid grid-cols-3 gap-0.5">
              {others.map((d) => {
                const since = daysSinceTrained(training, d.id)
                return (
                  <Link key={d.id} href={`/log/${d.id}`} className="btn-outline px-2.5 py-3">
                    <div className="truncate text-[17px] font-black uppercase">{d.name}</div>
                    <div className="k mt-1 text-neutral-500">{since === null ? 'New' : `${since}d`}</div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <aside className="hidden md:block md:px-7 md:py-10">
        <StreakBlock board={board} />
        <div className="mt-[30px] border-t-2 border-neutral-700 pt-3.5">
          <div className="k mb-3 text-neutral-500">Last 12 weeks</div>
          <WeekBars board={board} height={110} />
        </div>
        {records.length > 0 && (
          <div className="mt-[30px] border-t-2 border-neutral-700 pt-3.5">
            <RecordsList records={records} limit={5} />
          </div>
        )}
      </aside>
    </div>
  )
}

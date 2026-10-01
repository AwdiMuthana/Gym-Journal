import Link from 'next/link'
import { getSessionsList } from '@/lib/db'
import { getSessionTotals } from '@/lib/board'
import { ScreenTitle } from '../board-ui'
import { Volume } from '../weight'
import { DayStamp, MonthStrip, MonthYear } from './calendar'

export default async function HistoryPage() {
  const [sessions, totals] = await Promise.all([getSessionsList(), getSessionTotals()])

  if (sessions.length === 0) {
    return (
      <div>
        <ScreenTitle title="History" meta="0 sessions" />
        <p className="mt-[18px] text-[15px] leading-[1.5] font-medium text-neutral-500">
          Nothing logged yet. Finish a workout from the Log tab and it lands here.
        </p>
        <Link href="/log" className="btn-primary mt-4 block px-[18px] py-[22px] text-left text-[17px] font-black tracking-[0.02em] uppercase">
          Go to Log →
        </Link>
      </div>
    )
  }

  const oldest = sessions[sessions.length - 1]

  return (
    <div>
      <ScreenTitle
        title="History"
        meta={
          <>
            {sessions.length} session{sessions.length === 1 ? '' : 's'} · since <MonthYear iso={oldest.performed_at} />
          </>
        }
      />

      <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-10">
        <div className="pt-4 md:max-w-[360px]">
          <MonthStrip dates={sessions.map((s) => s.performed_at)} />
        </div>

        <div className="mt-5 border-t-2 border-neutral-700 md:mt-4">
          {sessions.map((s, i) => {
            const t = totals.get(s.id)
            const prs = t?.prs.size ?? 0
            return (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className={`flex gap-3.5 py-[15px] hover:bg-bg/[0.04] ${i === sessions.length - 1 ? 'border-b-2 border-neutral-700' : 'border-b border-neutral-800'}`}
              >
                <div className="w-11 shrink-0">
                  <DayStamp iso={s.performed_at} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[21px] leading-none font-black tracking-[-0.02em] uppercase">{s.day_name ?? 'Workout'}</div>
                  <div className="k num mt-[5px] text-neutral-500">
                    {s.total_sets} set{s.total_sets === 1 ? '' : 's'}
                    {t && t.volume > 0 && (
                      <>
                        {' · '}
                        <Volume lbs={t.volume} compact />
                      </>
                    )}
                    {s.plan_name && <> · {s.plan_name}</>}
                  </div>
                </div>
                {prs > 0 && <span className="k shrink-0 self-center text-accent">{prs} PR</span>}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

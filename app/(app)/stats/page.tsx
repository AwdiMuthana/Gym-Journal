import Link from 'next/link'
import { getLoggedExercises, getExerciseProgress, getPRs } from '@/lib/db'
import { getTraining, weeklyBoard } from '@/lib/board'
import { RecordsList, ScreenTitle, StreakBlock, WeekBars } from '../board-ui'
import ProgressChart from './progress-chart'
import ExercisePicker from './exercise-picker'

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ ex?: string }>
}) {
  const sp = await searchParams
  const [training, exercises, records] = await Promise.all([getTraining(), getLoggedExercises(), getPRs()])

  if (training.sessions.length === 0) {
    return (
      <div>
        <ScreenTitle title="The board" />
        <p className="mt-[18px] text-[15px] leading-[1.5] font-medium text-neutral-500">
          Nothing on the board yet. Log a few workouts and your streak, weeks and records show up here.
        </p>
        <Link href="/log" className="btn-primary mt-4 block px-[18px] py-[22px] text-left text-[17px] font-black tracking-[0.02em] uppercase">
          Go to Log →
        </Link>
      </div>
    )
  }

  const board = weeklyBoard(training)
  const effectiveExerciseKey = sp.ex ?? exercises[0]?.key
  const progress = effectiveExerciseKey ? await getExerciseProgress(effectiveExerciseKey) : []

  return (
    <div>
      <ScreenTitle
        title="The board"
        action={
          <Link href="/stats/last-workout" className="k shrink-0 text-neutral-500 hover:text-bg">
            Last workout →
          </Link>
        }
      />

      <div className="md:grid md:grid-cols-2 md:gap-10">
        <div>
          <div className="pt-[18px]">
            <StreakBlock board={board} />
          </div>
          <div className="mt-5 border-t-2 border-neutral-700 pt-3.5">
            <div className="k mb-2.5 text-neutral-500">Last 12 weeks</div>
            <WeekBars board={board} height={96} />
          </div>
        </div>

        {records.length > 0 && (
          <div className="mt-5 border-t-2 border-neutral-700 pt-3 md:mt-[18px] md:border-t-0 md:pt-0">
            <RecordsList records={records} collapseAfter={3} />
          </div>
        )}
      </div>

      {exercises.length > 0 && (
        <section className="mt-8 border-t-2 border-neutral-700 pt-3.5">
          <div className="k text-neutral-500">Progress · top weight, est. 1RM, volume</div>
          <div className="mt-3 mb-3">
            <ExercisePicker options={exercises} selected={effectiveExerciseKey} />
          </div>
          <ProgressChart data={progress} />
        </section>
      )}
    </div>
  )
}

import { notFound } from 'next/navigation'
import { getDayWithExercises, getLastSetsForExercise, getLoggedExercises } from '@/lib/db'
import SessionForm from './session-form'

export default async function LogSessionPage({
  params,
}: {
  params: Promise<{ dayId: string }>
}) {
  const { dayId } = await params
  const day = await getDayWithExercises(dayId)
  if (!day) notFound()

  // For each exercise, fetch last set log
  const [exercisesWithLast, recentExercises] = await Promise.all([
    Promise.all(
      day.exercises.map(async (ex) => ({
        exercise: ex,
        last: await getLastSetsForExercise(ex.id),
      }))
    ),
    getLoggedExercises(),
  ])

  return (
    <div className="mx-auto max-w-2xl">
      <SessionForm day={day} exercisesWithLast={exercisesWithLast} recentExercises={recentExercises} />
    </div>
  )
}
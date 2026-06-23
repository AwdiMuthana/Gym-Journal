import { notFound } from 'next/navigation'
import { getDayWithExercises, getLastSetsForExercise } from '@/lib/db'
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
  const exercisesWithLast = await Promise.all(
    day.exercises.map(async (ex) => ({
      exercise: ex,
      last: await getLastSetsForExercise(ex.id),
    }))
  )

  return <SessionForm day={day} exercisesWithLast={exercisesWithLast} />
}
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDayWithExercises } from '@/lib/db'
import {
  createExercise,
  deleteExercise,
  updateDay,
  updateExercise,
} from '@/app/plan-actions'

export default async function DayEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string; dayId: string }>
  searchParams: Promise<{ renameDay?: string; editEx?: string }>
}) {
  const { planId, dayId } = await params
  const sp = await searchParams
  const day = await getDayWithExercises(dayId)
  if (!day) notFound()

  const renameDayOpen = sp.renameDay === '1'
  const editExerciseId = sp.editEx

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/plan/${planId}`}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to plan
        </Link>
      </div>

      {renameDayOpen ? (
        <form
          action={updateDay}
          className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-4"
        >
          <input type="hidden" name="dayId" value={day.id} />
          <input type="hidden" name="planId" value={planId} />
          <input
            type="text"
            name="name"
            defaultValue={day.name}
            required
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-lg text-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
            <Link
              href={`/plan/${planId}/days/${day.id}`}
              className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">{day.name}</h2>
          <Link
            href={`/plan/${planId}/days/${day.id}?renameDay=1`}
            className="text-xs text-gray-500 hover:text-white"
          >
            Rename
          </Link>
        </div>
      )}

      {day.exercises.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          Add exercises below.
        </div>
      ) : (
        <div className="space-y-2">
          {day.exercises.map((ex) => {
            const isEditing = editExerciseId === ex.id
            if (isEditing) {
              return (
                <form
                  key={ex.id}
                  action={updateExercise}
                  className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-3"
                >
                  <input type="hidden" name="exerciseId" value={ex.id} />
                  <input type="hidden" name="planId" value={planId} />
                  <input type="hidden" name="dayId" value={day.id} />
                  <input
                    type="text"
                    name="name"
                    defaultValue={ex.name}
                    required
                    autoFocus
                    className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="target_sets"
                      min="1"
                      defaultValue={ex.target_sets}
                      className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white"
                    />
                    <input
                      type="text"
                      name="target_reps"
                      defaultValue={ex.target_reps}
                      className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
                    >
                      Save
                    </button>
                    <Link
                      href={`/plan/${planId}/days/${day.id}`}
                      className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              )
            }
            return (
              <div
                key={ex.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
              >
                <div className="flex-1">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-xs text-gray-500">
                    {ex.target_sets} × {ex.target_reps}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-3">
                  <Link
                    href={`/plan/${planId}/days/${day.id}?editEx=${ex.id}`}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    Edit
                  </Link>
                  <form action={deleteExercise}>
                    <input type="hidden" name="exerciseId" value={ex.id} />
                    <button
                      type="submit"
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form
        action={createExercise}
        className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-4"
      >
        <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
          Add exercise
        </p>
        <input type="hidden" name="dayId" value={day.id} />
        <input
          type="text"
          name="name"
          placeholder="Exercise name (e.g. Bench press)"
          required
          className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />
        <div className="flex gap-2">
          <input
            type="number"
            name="target_sets"
            min="1"
            placeholder="Sets"
            defaultValue="3"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
          <input
            type="text"
            name="target_reps"
            placeholder="Reps (e.g. 8-10)"
            defaultValue="8-10"
            className="w-full rounded-md border border-gray-700 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
        >
          + Add to session
        </button>
      </form>
    </div>
  )
}
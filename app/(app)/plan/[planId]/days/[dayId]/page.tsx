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
          className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
        >
          ← Back to plan
        </Link>
      </div>

      {renameDayOpen ? (
        <form
          action={updateDay}
          className="space-y-2 border-2 border-neutral-700 p-4"
        >
          <input type="hidden" name="dayId" value={day.id} />
          <input type="hidden" name="planId" value={planId} />
          <input
            type="text"
            name="name"
            defaultValue={day.name}
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
              href={`/plan/${planId}/days/${day.id}`}
              className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
            >
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-black uppercase tracking-tight">{day.name}</h2>
          <Link
            href={`/plan/${planId}/days/${day.id}?renameDay=1`}
            className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
          >
            Rename
          </Link>
        </div>
      )}

      {day.exercises.length === 0 ? (
        <div className="border-2 border-neutral-700 py-8 text-center text-sm text-neutral-400">
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
                  className="space-y-2 border-2 border-neutral-700 p-3"
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
                    className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg focus-visible:border-accent focus-visible:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="target_sets"
                      min="1"
                      defaultValue={ex.target_sets}
                      className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg focus-visible:border-accent focus-visible:outline-none"
                    />
                    <input
                      type="text"
                      name="target_reps"
                      defaultValue={ex.target_reps}
                      className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg focus-visible:border-accent focus-visible:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
                    >
                      Save
                    </button>
                    <Link
                      href={`/plan/${planId}/days/${day.id}`}
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
                key={ex.id}
                className="flex items-center justify-between border-2 border-neutral-700 px-4 py-3"
              >
                <div className="flex-1">
                  <p className="font-bold uppercase tracking-tight">{ex.name}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
                    {ex.target_sets} × {ex.target_reps}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-3">
                  <Link
                    href={`/plan/${planId}/days/${day.id}?editEx=${ex.id}`}
                    className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                  >
                    Edit
                  </Link>
                  <form action={deleteExercise}>
                    <input type="hidden" name="exerciseId" value={ex.id} />
                    <button
                      type="submit"
                      className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
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
        className="space-y-2 border-2 border-neutral-700 p-4"
      >
        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
          Add exercise
        </p>
        <input type="hidden" name="dayId" value={day.id} />
        <input
          type="text"
          name="name"
          placeholder="Exercise name (e.g. Bench press)"
          required
          className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            name="target_sets"
            min="1"
            placeholder="Sets"
            defaultValue="3"
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
          />
          <input
            type="text"
            name="target_reps"
            placeholder="Reps (e.g. 8-10)"
            defaultValue="8-10"
            className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg placeholder:text-neutral-600 focus-visible:border-accent focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-accent px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
        >
          + Add to session
        </button>
      </form>
    </div>
  )
}
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionDetail } from '@/lib/db'
import { updateSetLog, deleteSetLog, deleteSession } from '@/app/log-actions'
import LocalDateTime from '../../local-date-time'

export default async function HistorySessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>
  searchParams: Promise<{
    editSet?: string
    confirmDelete?: string
    confirmDeleteSet?: string
  }>
}) {
  const { sessionId } = await params
  const sp = await searchParams
  const session = await getSessionDetail(sessionId)
  if (!session) notFound()

  const editSetId = sp.editSet
  const confirmDelete = sp.confirmDelete === '1'
  const confirmDeleteSetId = sp.confirmDeleteSet

  return (
    <div className="space-y-4">
      <div>
        <Link href="/history" className="text-sm font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent">
          ← All history
        </Link>
      </div>

      <div>
        <h2 className="text-3xl font-black uppercase tracking-tight">
          {session.day_name ?? 'Workout'}
        </h2>
        <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-neutral-500">
          <LocalDateTime iso={session.performed_at} variant="full" />
          {session.plan_name && <> · {session.plan_name}</>}
        </p>
      </div>

      {session.exercises.length === 0 ? (
        <div className="border-2 border-neutral-700 py-8 text-center text-sm text-neutral-400">
          No sets logged in this workout.
        </div>
      ) : (
        <div className="space-y-3">
          {session.exercises.map((ex) => (
            <div
              key={ex.exercise_id ?? ex.exercise_name}
              className="border-2 border-neutral-700 p-3"
            >
              <p className="mb-3 font-bold uppercase tracking-tight">{ex.exercise_name}</p>
              <div className="space-y-2">
                {ex.sets.map((s) => {
                  const isEditing = editSetId === s.id
                  const isConfirmingDelete = confirmDeleteSetId === s.id
                  if (isEditing) {
                    return (
                      <form
                        key={s.id}
                        action={updateSetLog}
                        className="space-y-2 border-2 border-neutral-800 p-2.5"
                      >
                        <input type="hidden" name="setLogId" value={s.id} />
                        <input type="hidden" name="sessionId" value={session.id} />
                        <div className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                            Set {s.set_number}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            name="weight"
                            placeholder="Weight"
                            defaultValue={s.weight ?? ''}
                            className="w-full min-w-0 border-2 border-neutral-700 bg-transparent px-3 py-2 text-base font-bold tabular-nums text-bg focus-visible:border-accent focus-visible:outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            name="reps"
                            placeholder="Reps"
                            defaultValue={s.reps ?? ''}
                            className="w-full min-w-0 border-2 border-neutral-700 bg-transparent px-3 py-2 text-base font-bold tabular-nums text-bg focus-visible:border-accent focus-visible:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          name="notes"
                          placeholder="RPE / notes"
                          defaultValue={s.notes ?? ''}
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
                            href={`/history/${session.id}`}
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
                      key={s.id}
                      className="border-2 border-neutral-800 p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="mr-3 text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">
                            Set {s.set_number}
                          </span>
                          <span className="font-bold tabular-nums">
                            {s.weight ?? '–'} × {s.reps ?? '–'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/history/${session.id}?editSet=${s.id}`}
                            className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                          >
                            Edit
                          </Link>
                          {isConfirmingDelete ? (
                            <form action={deleteSetLog} className="flex gap-1">
                              <input type="hidden" name="setLogId" value={s.id} />
                              <input type="hidden" name="sessionId" value={session.id} />
                              <button
                                type="submit"
                                className="bg-accent-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-bg"
                              >
                                Delete
                              </button>
                              <Link
                                href={`/history/${session.id}`}
                                className="border-2 border-neutral-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-bg"
                              >
                                Cancel
                              </Link>
                            </form>
                          ) : (
                            <Link
                              href={`/history/${session.id}?confirmDeleteSet=${s.id}`}
                              className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-500 hover:text-accent"
                            >
                              Delete
                            </Link>
                          )}
                        </div>
                      </div>
                      {s.notes && (
                        <p className="mt-1 text-xs text-neutral-500">{s.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 border-t-2 border-neutral-800 pt-6">
        {confirmDelete ? (
          <div className="space-y-3 border-2 border-accent-700 p-4">
            <p className="text-sm">
              Delete this entire workout and all its logged sets? This
              can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <form action={deleteSession} className="flex-1">
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  className="w-full bg-accent-700 px-3 py-2 text-sm font-black uppercase tracking-wide text-bg"
                >
                  Yes, delete workout
                </button>
              </form>
              <Link
                href={`/history/${session.id}`}
                className="flex-1 border-2 border-neutral-700 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-bg"
              >
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/history/${session.id}?confirmDelete=1`}
            className="block w-full border-2 border-accent-800 px-4 py-2.5 text-center text-sm font-extrabold uppercase tracking-wide text-accent-500 hover:bg-accent-900/20"
          >
            Delete this workout
          </Link>
        )}
      </div>
    </div>
  )
}
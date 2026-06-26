import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionDetail } from '@/lib/db'
import {
  updateSetLog,
  deleteSetLog,
  deleteSession,
} from '@/app/log-actions'

function fmtFullDate(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

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
        <Link href="/history" className="text-sm text-gray-400 hover:text-white">
          ← All history
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">
          {session.day_name ?? 'Workout'}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          {fmtFullDate(session.performed_at)}
          {session.plan_name && <> · {session.plan_name}</>}
        </p>
      </div>

      {session.exercises.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-950 py-8 text-center text-sm text-gray-400">
          No sets logged in this workout.
        </div>
      ) : (
        <div className="space-y-3">
          {session.exercises.map((ex) => (
            <div
              key={ex.exercise_id ?? ex.exercise_name}
              className="rounded-lg border border-gray-800 bg-gray-950 p-3"
            >
              <p className="mb-3 font-medium">{ex.exercise_name}</p>
              <div className="space-y-2">
                {ex.sets.map((s) => {
                  const isEditing = editSetId === s.id
                  const isConfirmingDelete = confirmDeleteSetId === s.id
                  if (isEditing) {
                    return (
                      <form
                        key={s.id}
                        action={updateSetLog}
                        className="space-y-2 rounded-md border border-gray-800 bg-black p-2.5"
                      >
                        <input type="hidden" name="setLogId" value={s.id} />
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <div className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-xs font-medium text-gray-500">
                            Set {s.set_number}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            name="weight"
                            placeholder="Weight"
                            defaultValue={s.weight ?? ''}
                            className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2 text-base text-white"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            name="reps"
                            placeholder="Reps"
                            defaultValue={s.reps ?? ''}
                            className="w-full min-w-0 rounded border border-gray-700 bg-transparent px-3 py-2 text-base text-white"
                          />
                        </div>
                        <input
                          type="text"
                          name="notes"
                          placeholder="RPE / notes"
                          defaultValue={s.notes ?? ''}
                          className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 text-sm text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-md bg-[#5B5BD6] px-3 py-2 text-sm font-medium text-white"
                          >
                            Save
                          </button>
                          <Link
                            href={`/history/${session.id}`}
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
                      key={s.id}
                      className="rounded-md border border-gray-800 bg-black p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="mr-3 text-gray-500">
                            Set {s.set_number}
                          </span>
                          <span>
                            {s.weight ?? '–'} × {s.reps ?? '–'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/history/${session.id}?editSet=${s.id}`}
                            className="text-xs text-gray-500 hover:text-white"
                          >
                            Edit
                          </Link>
                          {isConfirmingDelete ? (
                            <form action={deleteSetLog} className="flex gap-1">
                              <input
                                type="hidden"
                                name="setLogId"
                                value={s.id}
                              />
                              <input
                                type="hidden"
                                name="sessionId"
                                value={session.id}
                              />
                              <button
                                type="submit"
                                className="rounded bg-red-600 px-2 py-0.5 text-xs text-white"
                              >
                                Delete
                              </button>
                              <Link
                                href={`/history/${session.id}`}
                                className="rounded border border-gray-700 px-2 py-0.5 text-xs"
                              >
                                Cancel
                              </Link>
                            </form>
                          ) : (
                            <Link
                              href={`/history/${session.id}?confirmDeleteSet=${s.id}`}
                              className="text-xs text-gray-500 hover:text-red-400"
                            >
                              Delete
                            </Link>
                          )}
                        </div>
                      </div>
                      {s.notes && (
                        <p className="mt-1 text-xs text-gray-500">{s.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 border-t border-gray-800 pt-6">
        {confirmDelete ? (
          <div className="space-y-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm">
              Delete this entire workout and all its logged sets? This
              can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <form action={deleteSession} className="flex-1">
                <input type="hidden" name="sessionId" value={session.id} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Yes, delete workout
                </button>
              </form>
              <Link
                href={`/history/${session.id}`}
                className="flex-1 rounded-md border border-gray-700 px-3 py-2 text-center text-sm text-gray-300"
              >
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/history/${session.id}?confirmDelete=1`}
            className="block w-full rounded-md border border-red-900 px-4 py-2.5 text-center text-sm text-red-400 hover:bg-red-950/30"
          >
            Delete this workout
          </Link>
        )}
      </div>
    </div>
  )
}
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Option = { exercise_id: string; name: string; session_count: number }

export default function ExercisePicker({
  options,
  selected,
}: {
  options: Option[]
  selected: string | undefined
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <select
      value={selected ?? ''}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString())
        if (e.target.value) {
          params.set('ex', e.target.value)
        } else {
          params.delete('ex')
        }
        router.push(`/stats?${params.toString()}`)
      }}
      className="w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white"
    >
      <option value="">Select an exercise…</option>
      {options.map((o) => (
        <option key={o.exercise_id} value={o.exercise_id}>
          {o.name} ({o.session_count} session{o.session_count === 1 ? '' : 's'})
        </option>
      ))}
    </select>
  )
}
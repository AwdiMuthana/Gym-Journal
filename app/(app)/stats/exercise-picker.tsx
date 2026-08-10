'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Option = { key: string; name: string; session_count: number }

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
      className="w-full border-2 border-neutral-700 bg-transparent px-3 py-2 text-sm text-bg focus-visible:border-accent focus-visible:outline-none"
    >
      <option value="">Select an exercise…</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.name} ({o.session_count} session{o.session_count === 1 ? '' : 's'})
        </option>
      ))}
    </select>
  )
}
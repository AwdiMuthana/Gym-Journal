import Link from 'next/link'
import ClearSessionStorage from './clear-storage'

export default async function LogDonePage({
  searchParams,
}: {
  searchParams: Promise<{ dayId?: string }>
}) {
  const params = await searchParams
  return (
    <div className="space-y-4 py-12 text-center">
      <ClearSessionStorage dayId={params.dayId} />
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#5B5BD6] text-2xl">
        ✓
      </div>
      <h2 className="text-2xl font-semibold">Workout logged</h2>
      <p className="text-sm text-gray-400">Nice work.</p>
      <div className="flex justify-center gap-2 pt-4">
        <Link
          href="/log"
          className="rounded-md bg-[#5B5BD6] px-4 py-2 text-sm font-medium text-white"
        >
          Log another
        </Link>
        <Link
          href="/plan"
          className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300"
        >
          Back to Plan
        </Link>
      </div>
    </div>
  )
}
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '../header'
import Tabs from '../tabs'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <Tabs />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  )
}
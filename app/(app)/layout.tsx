import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '../header'
import Tabs, { AppMain, HideOnFullscreen } from '../tabs'

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
    <div className="min-h-screen bg-ink text-bg">
      <HideOnFullscreen>
        <Header />
      </HideOnFullscreen>
      <AppMain>{children}</AppMain>
      <Tabs />
    </div>
  )
}

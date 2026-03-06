import { Navigation } from '@/components/layout/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/layout/user-menu'
import Image from 'next/image'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col'>
      <header className='border-b border-blue-900 bg-blue-950 shadow-sm top-0 sticky z-50'>
        <div className='container mx-auto px-4 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-8'>
            <div className='relative w-40 h-12 ml-2'>
              <Image src='/admiral-logo.png' alt='אדמירל' fill className='object-contain' priority />
            </div>
            <Navigation />
          </div>
          <div className='flex items-center gap-4'>
            {user && <UserMenu user={user} />}
          </div>
        </div>
      </header>
      <main className='flex-1 container mx-auto px-4 py-8'>{children}</main>
    </div>
  )
}

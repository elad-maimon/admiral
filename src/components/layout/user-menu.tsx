'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function UserMenu({ user }: { user: User }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatarUrl = user.user_metadata?.avatar_url
  const fullName = user.user_metadata?.full_name || user.email

  return (
    <div className='relative'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-transparent ring-offset-2 hover:ring-slate-200 transition-all focus:outline-none bg-slate-100 border border-slate-200 overflow-hidden'
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt='Avatar' className='w-full h-full object-cover' />
        ) : (
          <UserIcon className='w-4 h-4 text-slate-500' />
        )}
      </button>

      {isOpen && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setIsOpen(false)} />
          <div
            className='absolute left-0 top-full mt-2 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-lg z-50 origin-top-left animate-in fade-in slide-in-from-top-2'
            dir='rtl'
          >
            <div className='flex flex-col px-2 py-2 border-b border-slate-100 mb-2 truncate'>
              <span className='text-sm font-medium text-slate-900 truncate block'>{fullName}</span>
              <span className='text-xs text-slate-500 truncate block' dir='ltr'>{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className='flex w-full items-center rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium border border-transparent'
            >
              <LogOut className='w-4 h-4 ml-2' />
              התנתקות
            </button>
          </div>
        </>
      )}
    </div>
  )
}

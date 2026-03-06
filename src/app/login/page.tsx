'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account'
        }
      }
    })

    if (error) {
      if (error.message.includes('provider is not enabled')) {
        setError('התחברות דרך גוגל לא מופעלת בפרויקט ה-Supabase שלך.')
      } else {
        setError(error.message)
      }
      setIsLoading(false)
    }
  }

  return (
    <div
      className='min-h-screen bg-[#0f172a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans'
      dir='rtl'
    >
      <div className='sm:mx-auto sm:w-full sm:max-w-md text-center z-10 relative mt-[-5vh]'>
        <div className='mx-auto h-28 w-80 relative mb-6 drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500'>
          <Image
            src='/admiral-logo.png'
            alt='אדמירל לוגו'
            fill
            className='object-contain'
            priority
          />
        </div>
        <p className='text-center text-base text-blue-200/80 font-medium tracking-wide mx-auto -mt-2'>
          ניהול יוזמות, צוותים ומשימות למפקדים בים וביבשה
        </p>
      </div>

      <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-md z-10 relative'>
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 py-10 px-6 sm:px-10 shadow-2xl sm:rounded-3xl space-y-8 relative overflow-hidden'>
          {/* Shine effect inside card */}
          <div className='absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent' />

          {error && (
            <div className='rounded-xl border border-red-500/50 bg-red-950/50 p-4 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300'>
              <div className='flex items-center gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center'>
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4 text-red-400'>
                    <path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'/>
                    <path d='M12 9v4'/>
                    <path d='M12 17h.01'/>
                  </svg>
                </div>
                <div className='flex-1'>
                  <h5 className='mb-1 font-bold text-sm leading-none text-red-200'>שגיאת התחברות</h5>
                  <div className='text-xs text-red-300/80 leading-relaxed font-medium'>
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className='space-y-6 pt-2'>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className='w-full flex justify-center items-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary h-12 transition-all'
            >
              {isLoading ? (
                'מתחבר...'
              ) : (
                <>
                  <svg className='ml-3 h-5 w-5' viewBox='0 0 24 24'>
                    <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
                    <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
                    <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05' />
                    <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
                  </svg>
                  כניסה מהירה עם Google
                </>
              )}
            </Button>
          </div>
        </div>

        <p className='mt-8 text-center text-xs text-blue-200/50 uppercase tracking-widest font-semibold'>
          מערכת לניהול פנימי • גישה מורשית בלבד
        </p>
      </div>
    </div>
  )
}

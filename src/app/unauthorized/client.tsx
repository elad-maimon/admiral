'use client'

import { useState } from 'react'
import { submitJoinRequest, resubmitJoinRequest } from './actions'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut, Clock, XCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type RequestStatus = 'none' | 'pending' | 'declined' | 'max_attempts'

interface UnauthorizedClientProps {
  initialStatus: RequestStatus
  declinedDate?: string
  attemptsRemaining?: number
}

export function UnauthorizedClient({ initialStatus, declinedDate, attemptsRemaining }: UnauthorizedClientProps) {
  const [status, setStatus] = useState<RequestStatus>(initialStatus)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRequestAccess = async () => {
    setIsLoading(true)
    try {
      if (status === 'none') {
        await submitJoinRequest()
      } else if (status === 'declined') {
        await resubmitJoinRequest()
      }
      setStatus('pending')
    } catch (e: any) {
      alert(e.message)
    } finally {
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
          <Image src='/admiral-logo.png' alt='אדמירל לוגו' fill className='object-contain' priority />
        </div>
        <p className='text-center text-base text-blue-200/80 font-medium tracking-wide mx-auto -mt-2'>
          ניהול יוזמות, צוותים ומשימות למנהלים שמנווטים במים סוערים
        </p>
      </div>

      <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-md z-10 relative'>
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 py-10 px-6 sm:px-10 shadow-2xl sm:rounded-3xl space-y-8 relative overflow-hidden text-center'>
          {/* Shine effect inside card */}
          <div className='absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent' />

          {status === 'none' && (
            <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10'>
              <div className='mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]'>
                <ShieldAlert className='w-8 h-8 text-amber-400' />
              </div>
              <h3 className='text-2xl font-bold text-white mb-2'>אין הרשאות גישה</h3>
              <p className='text-blue-100/70 mb-8 max-w-xs mx-auto text-sm'>
                החשבון איתו התחברת אינו משויך לארגון. המערכת מיועדת למורשים בלבד.
              </p>
              <Button
                onClick={handleRequestAccess}
                className='w-full h-12 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                disabled={isLoading}
              >
                {isLoading ? 'שולח...' : 'בקש אישור הצטרפות'}
                {!isLoading && <Send className='w-4 h-4 mr-2' />}
              </Button>
            </div>
          )}

          {status === 'pending' && (
            <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10'>
              <div className='mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]'>
                <Clock className='w-8 h-8 text-blue-400 animate-pulse' />
              </div>
              <h3 className='text-2xl font-bold text-white mb-2'>בקשתך בטיפול</h3>
              <p className='text-blue-100/70 mb-8 max-w-xs mx-auto text-sm'>
                נשלחה בקשת הצטרפות למנהלי המערכת. תקבל גישה ברגע שהללו יאשרו אותך.
              </p>
            </div>
          )}

          {status === 'declined' && (
            <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10'>
              <div className='mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]'>
                <XCircle className='w-8 h-8 text-red-400' />
              </div>
              <h3 className='text-2xl font-bold text-white mb-2'>הבקשה נדחתה</h3>
              <div className='rounded-xl bg-slate-900/50 border border-slate-700 p-4 mb-6 shadow-sm backdrop-blur-md'>
                <p className='text-blue-100/80 text-sm font-medium'>
                  בקשתך הקודמת נדחתה בתאריך: <br />
                  <span className='font-bold text-white tracking-wider mt-1 block' dir='ltr'>
                    {declinedDate}
                  </span>
                </p>
                <div className='mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-amber-400 bg-amber-950/40 rounded-lg py-2 px-3 w-max mx-auto border border-amber-500/20'>
                  <ShieldAlert className='w-4 h-4' />
                  <span>נותרו {attemptsRemaining} נסיונות לערעור</span>
                </div>
              </div>
              <Button
                onClick={handleRequestAccess}
                className='w-full h-12 text-sm font-bold bg-white text-slate-900 hover:bg-slate-200 transition-all rounded-xl shadow-lg'
                disabled={isLoading}
              >
                {isLoading ? 'שולח...' : 'הגש בקשה מחדש'}
              </Button>
            </div>
          )}

          {status === 'max_attempts' && (
            <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10'>
              <div className='mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700 shadow-inner'>
                <ShieldAlert className='w-8 h-8 text-slate-500' />
              </div>
              <h3 className='text-2xl font-bold text-white mb-2'>הגישה נחסמה</h3>
              <p className='text-blue-100/70 mb-8 max-w-xs mx-auto text-sm leading-relaxed'>
                בקשתך נדחתה מספר רב מדי של פעמים (3 נסיונות). אנא פנה למנהל המערכת באופן פרטני לקבלת גישה.
              </p>
            </div>
          )}

          <div className='pt-6 mt-6 border-t border-white/10 flex justify-center relative z-10'>
            <button
              onClick={handleSignOut}
              className='flex items-center gap-2 text-sm font-medium text-blue-200/50 hover:text-red-400 transition-colors'
            >
              <LogOut className='w-4 h-4' />
              התנתק מחשבון זה
            </button>
          </div>
        </div>

        <p className='mt-8 text-center text-xs text-blue-200/50 uppercase tracking-widest font-semibold'>
          מערכת לניהול פנימי • גישה מורשית בלבד
        </p>
      </div>
    </div>
  )
}

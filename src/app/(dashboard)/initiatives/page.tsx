import { Suspense } from 'react'
import { InitiativesDashboard } from '@/components/initiatives/initiatives-dashboard'

export default function InitiativesPage() {
  return (
    <Suspense fallback={<div className='p-8 animate-pulse text-center'>Loading...</div>}>
      <InitiativesDashboard />
    </Suspense>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { i18n } from '@/lib/i18n'
import { LayoutDashboard, Target, ListTodo, Map, Users } from 'lucide-react'

export function Navigation() {
  return (
    <nav className='hidden md:flex items-center gap-2'>
      <NavLink href='/initiatives' icon={<LayoutDashboard className='w-4 h-4' />}>
        {i18n.nav.initiatives}
      </NavLink>
      <NavLink href='/deliverables' icon={<ListTodo className='w-4 h-4' />}>
        {i18n.nav.epics}
      </NavLink>
      <NavLink href='/lighthouse' icon={<Target className='w-4 h-4' />}>
        {i18n.nav.lighthouse}
      </NavLink>
      <NavLink href='/roadmap' icon={<Map className='w-4 h-4' />}>
        {i18n.nav.roadmap}
      </NavLink>
      <NavLink href='/teams' icon={<Users className='w-4 h-4' />}>
        {i18n.nav.teams}
      </NavLink>
    </nav>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname()
  const [actualHref, setActualHref] = useState(href)

  useEffect(() => {
    if (href === '/deliverables') {
      const savedState = localStorage.getItem('admiral_deliverables_state')
      if (savedState) {
        setActualHref(`${href}${savedState}`)
      }
    } else if (href === '/initiatives') {
      const savedState = localStorage.getItem('admiral_initiatives_state')
      if (savedState) {
        setActualHref(`${href}${savedState}`)
      }
    } else if (href === '/teams') {
      const savedState = localStorage.getItem('admiral_teams_state')
      if (savedState) {
        setActualHref(`${href}${savedState}`)
      }
    }
  }, [href, pathname])

  return (
    <Link
      href={actualHref}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        pathname.startsWith(href)
          ? 'text-white bg-blue-800/80 shadow-sm'
          : 'text-blue-200 hover:text-white hover:bg-blue-800/40'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

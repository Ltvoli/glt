import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import CalendarClient from './calendar-client'
import Link from 'next/link'

export default async function CalendarPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Agenda Global</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/planning" className="button outline">Mode Liste</Link>
          <Link href="/planning/edit" className="button primary">Nouvelle Permanence</Link>
        </div>
      </div>
      <CalendarClient />
    </div>
  )
}

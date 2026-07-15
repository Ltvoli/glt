import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PlanningEditForm from './planning-edit-form'

function getCurrentWeekDates() {
  const now = new Date()
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek = utcNow.getUTCDay()
  
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  
  const monday = new Date(utcNow)
  monday.setUTCDate(utcNow.getUTCDate() + diffToMonday)
  
  const week = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    week.push(d)
  }
  return week
}

export default async function PlanningEditPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const dbUsers = await prisma.user.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ],
    select: { id: true, firstName: true, lastName: true }
  })

  const users = dbUsers.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim()
  }))

  const weekDates = getCurrentWeekDates()

  // On récupère le statut de chaque utilisateur pour la semaine pour l'injecter au form client
  const allStatuses = await prisma.employeeStatus.findMany({
    where: {
      date: {
        gte: weekDates[0],
        lte: weekDates[4]
      }
    }
  })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/planning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour au planning
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Administration du Planning</h1>
        <p style={{ color: 'var(--text-muted)' }}>Définissez la semaine entière pour un collaborateur</p>
      </div>

      <div className="card">
        <PlanningEditForm 
          users={users} 
          weekDates={weekDates.map(d => d.toISOString())} 
          allStatuses={allStatuses}
        />
      </div>
    </div>
  )
}

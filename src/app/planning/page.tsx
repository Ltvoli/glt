import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Fonction utilitaire pour obtenir les dates de la semaine en cours (Lundi à Vendredi)
function getCurrentWeekDates() {
  const curr = new Date()
  const week = []
  
  // Si on est dimanche (0), reculer de 6 jours pour trouver le lundi, sinon reculer de (jour - 1)
  const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
  const firstDay = new Date(curr.setDate(first))
  
  for (let i = 0; i < 5; i++) { // Lundi à Vendredi
    const d = new Date(firstDay)
    d.setDate(d.getDate() + i)
    // Normaliser à minuit UTC pour correspondre à la BDD
    week.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())))
  }
  return week
}

export default async function PlanningPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const weekDates = getCurrentWeekDates()
  const startOfWeek = weekDates[0]
  const endOfWeek = weekDates[4]

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      statuses: {
        where: {
          date: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        }
      }
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PARIS': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dbeafe', color: '#2563eb', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>PARIS</span>
      case 'CIRCO': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>CIRCO</span>
      case 'TELETRAVAIL': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>TÉLÉTRAVAIL</span>
      case 'DEPLACEMENT': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ffedd5', color: '#c2410c', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>DÉPLACEMENT</span>
      case 'CONGE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dcfce3', color: '#16a34a', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>CONGÉ</span>
      case 'MALADIE': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>MALADIE</span>
      case 'ABSENT': return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>ABSENT</span>
      default: return null
    }
  }

  const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Planning de l'Équipe</h1>
          <p style={{ color: 'var(--text-muted)' }}>Semaine du {startOfWeek.toLocaleDateString('fr-FR')} au {endOfWeek.toLocaleDateString('fr-FR')}</p>
        </div>
        <Link href="/planning/edit" className="button outline">
          Gérer le planning
        </Link>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '20%' }}>Collaborateur</th>
              {weekDates.map((date, i) => (
                <th key={i} style={{ textAlign: 'center', width: '16%' }}>
                  {daysOfWeek[i]} <br/>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                    {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                {weekDates.map((date, i) => {
                  // Chercher le statut pour ce jour
                  const statusObj = user.statuses.find(s => s.date.getTime() === date.getTime())
                  return (
                    <td key={i} style={{ textAlign: 'center' }}>
                      {statusObj ? getStatusBadge(statusObj.status) : <span style={{ color: 'var(--border)' }}>-</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

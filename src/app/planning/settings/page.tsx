import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { upsertEmployeeSetting } from '../actions'

export default async function PlanningSettingsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  // Permissions: ADMIN requis (pour simplifier, on suppose que Lionel et Magali ont le rôle ADMIN)
  if (user?.role !== 'ADMIN') redirect('/planning')

  const employees = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { employeeSetting: true }
  })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/planning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem' }}>
        <ArrowLeft size={16} /> Retour au planning
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Settings size={28} color="var(--primary)" />
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Paramétrage des compteurs</h1>
      </div>

      <div className="card">
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Définissez ici le quota annuel de jours travaillés pour chaque collaborateur. La période de référence court du 1er Juin au 31 Mai de l&apos;année suivante.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {employees.map(emp => {
            const currentQuota = emp.employeeSetting?.annualWorkingDays || 218;

            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{emp.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</p>
                  </div>
                </div>

                <form action={async (formData) => {
                  'use server'
                  const days = parseInt(formData.get('days') as string)
                  if (!isNaN(days)) {
                    await upsertEmployeeSetting(emp.id, days)
                  }
                }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Quota :</label>
                  <input 
                    type="number" 
                    name="days" 
                    defaultValue={currentQuota} 
                    className="form-control" 
                    style={{ width: '80px', margin: 0 }} 
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>jours / an</span>
                  <button type="submit" className="button primary" style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}>Enregistrer</button>
                </form>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

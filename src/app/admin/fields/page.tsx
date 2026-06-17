import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import FieldsClient from './fields-client'

export const metadata = {
  title: 'Configuration des champs - Tivoli',
}

export default async function AdminFieldsPage() {
  const session = await getSession()
  if (!session?.userId || (session.dbRole !== 'ADMINISTRATEUR' && session.dbRole !== 'SUPERVISEUR')) {
    redirect('/')
  }
  
  // We fetch all field configs across all modules
  const fields = await prisma.fieldConfig.findMany({
    orderBy: { order: 'asc' }
  })
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Configuration des Formulaires</h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
          Gérez l'affichage, l'ordre et le nom des champs pour chaque module de l'application.
        </p>
      </div>
      
      <FieldsClient initialFields={fields} />
    </div>
  )
}

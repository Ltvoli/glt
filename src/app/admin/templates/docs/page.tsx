import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import TemplatesClient from './templates-client'

export default async function AdminTemplatesPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/admin-login')
  }

  const templates = await prisma.documentTemplate.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="card">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Modèles de Documents (Publipostage)</h2>
        <p className="text-muted">Gérez vos matrices Word (.docx) pour générer automatiquement des courriers.</p>
      </div>
      
      <TemplatesClient initialTemplates={templates} />
    </div>
  )
}

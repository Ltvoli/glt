import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { FileCode, Plus, Sparkles, Shield, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import TemplateStudioClient from './TemplateStudioClient'
import { seedMailTemplates } from '@/lib/seed-mail-templates'

export default async function MailTemplatesPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  // Auto seed default templates if empty
  await seedMailTemplates().catch(() => {})

  const templates = await prisma.mailTemplate.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ],
    include: {
      createdBy: { select: { firstName: true, lastName: true } }
    }
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Administration
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.6rem', backgroundColor: '#f3e8ff', borderRadius: '10px', color: '#7c3aed' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Template Studio V1</h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                Gestion de la bibliothèque de modèles institutionnels et des variables dynamiques
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Client UI */}
      <TemplateStudioClient initialTemplates={templates} />
    </div>
  )
}

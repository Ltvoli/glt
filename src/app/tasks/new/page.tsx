import TaskForm from './task-form'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function NewTaskPage() {
  const users = await prisma.user.findMany()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/tasks" className="button outline">Retour</Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Nouvelle Tâche</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        <TaskForm users={users} />
      </div>
    </div>
  )
}

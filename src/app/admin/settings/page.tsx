import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SettingList from './setting-list'

export default async function AdminSettingsPage() {
  const session = await getSession()
  if (session?.role !== 'SUPERADMIN') {
    redirect('/admin')
  }

  const settings = await prisma.setting.findMany({
    orderBy: [
      { category: 'asc' },
      { key: 'asc' }
    ]
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-color)]">Paramètres Système</h1>
        <p className="text-gray-500 mt-2">Configuration technique globale (SaaS). Ces clés sont partagées au niveau de l'instance.</p>
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl p-6 border border-[var(--border-color)]">
        <SettingList initialSettings={settings} />
      </div>
    </div>
  )
}

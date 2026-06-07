import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getSession()
  if (session?.role !== 'SUPERADMIN' && session?.role !== 'ADMIN') {
    redirect('/admin')
  }

  const page = Number(searchParams.page) || 1
  const limit = 50
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.auditLog.count()
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-color)]">Journaux d'Audit & RGPD</h1>
          <p className="text-gray-500 mt-2">Traçabilité complète des actions sur la plateforme. Conservés 12 mois (RGPD).</p>
        </div>
        <a 
          href="/api/admin/audit/export" 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors inline-flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Exporter en CSV
        </a>
      </div>

      <div className="bg-[var(--card-bg)] shadow rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Entité</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {log.createdAt.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.user ? `${log.user.name} (${log.user.email})` : 'Système'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium
                      ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' : 
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 
                        log.action === 'DELETE' || log.action === 'ARCHIVE' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {log.entity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                    {log.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {page} sur {totalPages} ({total} logs)
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/admin/audit?page=${page - 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  Précédent
                </a>
              )}
              {page < totalPages && (
                <a href={`/admin/audit?page=${page + 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  Suivant
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

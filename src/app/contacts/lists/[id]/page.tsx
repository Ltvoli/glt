import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Users, Trash2, ArrowLeft, Search } from 'lucide-react'
import { removeContactFromList } from '../actions'
import ConfirmButton from '@/components/ui/confirm-button'
import SyncListButton from './sync-list-button'

export default async function ContactListDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params
  const sParams = await searchParams

  const page = parseInt(sParams.page || '1', 10)
  const q = sParams.q || ''
  const itemsPerPage = 50
  const skip = (page - 1) * itemsPerPage

  // Construct filters
  const whereClause: any = {
    archivedAt: null,
    lists: {
      some: { id }
    }
  }

  if (q.trim()) {
    whereClause.OR = [
      { firstName: { contains: q.trim(), mode: 'insensitive' } },
      { lastName: { contains: q.trim(), mode: 'insensitive' } },
      { email: { contains: q.trim(), mode: 'insensitive' } },
      { mobilePhone: { contains: q.trim(), mode: 'insensitive' } },
      { city: { contains: q.trim(), mode: 'insensitive' } },
    ]
  }

  const [list, totalContacts, contacts] = await Promise.all([
    prisma.contactList.findUnique({
      where: { id },
      select: { id: true, name: true, description: true }
    }),
    prisma.contact.count({
      where: whereClause
    }),
    prisma.contact.findMany({
      where: whereClause,
      orderBy: { lastName: 'asc' },
      skip,
      take: itemsPerPage,
      include: {
        tags: { include: { tag: true } }
      }
    })
  ])

  if (!list) notFound()

  const totalPages = Math.ceil(totalContacts / itemsPerPage)

  // Remove contact server action
  async function handleRemove(formData: FormData) {
    'use server'
    const contactId = formData.get('contactId') as string
    await removeContactFromList(id, contactId)
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link 
          href="/contacts/lists" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '4px', 
            fontSize: '0.85rem', 
            color: '#64748b', 
            textDecoration: 'none',
            marginBottom: '0.75rem'
          }}
        >
          <ArrowLeft size={14} /> Retour aux listes
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{list.name}</h1>
            {list.description && (
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>{list.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <SyncListButton listId={list.id} />
            <Link 
              href={`/contacts/communication?listId=${list.id}`} 
              className="button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ✉️ Envoyer un message groupé
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
            Membres de la liste ({totalContacts})
          </h2>

          {/* Search bar inside the list */}
          <form method="GET" style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Rechercher un membre..."
                className="form-control"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', height: '36px' }}
              />
            </div>
            <button type="submit" className="button" style={{ fontSize: '0.85rem', padding: '0 1rem', height: '36px' }}>
              Rechercher
            </button>
            {q && (
              <Link href={`/contacts/lists/${id}`} className="button outline" style={{ fontSize: '0.85rem', padding: '0 1rem', height: '36px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                Effacer
              </Link>
            )}
          </form>
        </div>

        {totalContacts === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#94a3b8' }}>
            <Users size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              {q ? 'Aucun membre ne correspond à votre recherche.' : 'Cette liste est vide pour le moment.'}
            </p>
            {!q && (
              <>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Allez dans la liste principale des contacts, sélectionnez des fiches et ajoutez-les à cette liste.</p>
                <Link href="/contacts" className="button outline" style={{ display: 'inline-flex', marginTop: '1rem', fontSize: '0.8rem' }}>
                  Ajouter des contacts
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Nom</th>
                    <th style={{ padding: '0.75rem' }}>Email</th>
                    <th style={{ padding: '0.75rem' }}>Portable</th>
                    <th style={{ padding: '0.75rem' }}>Ville</th>
                    <th style={{ padding: '0.75rem' }}>Tags</th>
                    <th style={{ padding: '0.75rem', width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        <Link href={`/contacts/${contact.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#334155' }}>{contact.email || '-'}</td>
                      <td style={{ padding: '0.75rem', color: '#334155' }}>{contact.mobilePhone || '-'}</td>
                      <td style={{ padding: '0.75rem', color: '#334155' }}>{contact.city || '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {contact.tags.slice(0, 3).map((ct) => (
                            <span 
                              key={ct.tag.id} 
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '2px 6px', 
                                borderRadius: '999px',
                                backgroundColor: ct.tag.color || '#6366f1',
                                color: 'white'
                              }}
                            >
                              {ct.tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <form action={handleRemove} style={{ display: 'inline' }}>
                          <input type="hidden" name="contactId" value={contact.id} />
                          <ConfirmButton
                            confirmMessage={`Retirer ${contact.firstName} ${contact.lastName} de cette liste ?`}
                            type="submit"
                            className="button outline"
                            style={{ 
                              fontSize: '0.75rem', 
                              padding: '4px 6px', 
                              color: '#ef4444', 
                              borderColor: '#fee2e2' 
                            }}
                            title="Retirer de la liste"
                          >
                            Retirer
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '1.5rem', alignItems: 'center' }}>
                {page > 1 ? (
                  <Link href={`/contacts/lists/${id}?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="button outline" style={{ padding: '4px 10px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Précédent
                  </Link>
                ) : (
                  <span className="button outline" style={{ padding: '4px 10px', fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }}>Précédent</span>
                )}
                
                <span style={{ fontSize: '0.825rem', margin: '0 0.5rem', color: '#64748b' }}>
                  Page <strong>{page}</strong> sur {totalPages}
                </span>

                {page < totalPages ? (
                  <Link href={`/contacts/lists/${id}?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="button outline" style={{ padding: '4px 10px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    Suivant
                  </Link>
                ) : (
                  <span className="button outline" style={{ padding: '4px 10px', fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }}>Suivant</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

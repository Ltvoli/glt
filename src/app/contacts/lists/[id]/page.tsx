import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Users, MailOpen, Trash2, ArrowLeft, Search } from 'lucide-react'
import { removeContactFromList } from '../actions'
import ConfirmButton from '@/components/ui/confirm-button'

export default async function ContactListDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const { id } = await params

  const list = await prisma.contactList.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { lastName: 'asc' },
        include: {
          tags: { include: { tag: true } }
        }
      }
    }
  })

  if (!list) notFound()

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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
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
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} style={{ color: 'var(--primary)' }} />
          Membres de la liste ({list.contacts.length})
        </h2>

        {list.contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#94a3b8' }}>
            <Users size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Cette liste est vide pour le moment.</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Allez dans la liste principale des contacts, sélectionnez des fiches et ajoutez-les à cette liste.</p>
            <Link href="/contacts" className="button outline" style={{ display: 'inline-flex', marginTop: '1rem', fontSize: '0.8rem' }}>
              Ajouter des contacts
            </Link>
          </div>
        ) : (
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
                {list.contacts.map((contact) => (
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
        )}
      </div>
    </div>
  )
}

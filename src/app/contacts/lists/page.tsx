import prisma from '@/lib/prisma'
import Link from 'next/link'
import ContactsTabs from '../contacts-tabs'
import { FolderPlus, Trash2, Users, Calendar, ArrowRight } from 'lucide-react'
import { createContactList, deleteContactList } from './actions'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ConfirmButton from '@/components/ui/confirm-button'

export default async function ContactListsPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const lists = await prisma.contactList.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  })

  // Action for list creation
  async function handleCreate(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    
    await createContactList(name, description)
  }

  // Action for list deletion
  async function handleDelete(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    await deleteContactList(id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Contacts</h1>
      </div>

      <ContactsTabs />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Colonne gauche : liste des listes */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>
              Vos listes de diffusion ({lists.length})
            </h2>

            {lists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#94a3b8' }}>
                <Users size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.95rem' }}>Vous n&apos;avez pas encore créé de liste.</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>Sélectionnez des contacts pour en créer une, ou utilisez le formulaire à droite.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lists.map(list => (
                  <div 
                    key={list.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card-bg)',
                    }}
                  >
                    <div>
                      <Link 
                        href={`/contacts/lists/${list.id}`} 
                        style={{ 
                          fontSize: '1rem', 
                          fontWeight: 600, 
                          color: 'var(--primary)', 
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {list.name} <ArrowRight size={14} />
                      </Link>
                      {list.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          {list.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {list._count.contacts} contact(s)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> Créé le {new Date(list.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link 
                        href={`/contacts/communication?listId=${list.id}`} 
                        className="button outline"
                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                      >
                        ✉️ Message
                      </Link>
                      <form action={handleDelete} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={list.id} />
                        <ConfirmButton
                          confirmMessage="Supprimer cette liste ? Les contacts ne seront pas supprimés."
                          type="submit"
                          className="button outline"
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '4px 8px', 
                            color: '#ef4444', 
                            borderColor: '#fee2e2' 
                          }}
                        >
                          <Trash2 size={13} />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : création */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderPlus size={16} style={{ color: 'var(--primary)' }} />
            Nouvelle liste
          </h2>
          <form action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nom de la liste *</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                className="form-control" 
                placeholder="ex: Quartier Centre Ville" 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="description" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description</label>
              <textarea 
                id="description" 
                name="description" 
                className="form-control" 
                placeholder="Optionnel..." 
                rows={3}
              />
            </div>
            <button type="submit" className="button" style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}>
              Créer la liste
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

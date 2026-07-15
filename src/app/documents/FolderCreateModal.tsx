'use client'

import { useState } from 'react'
import { FolderPlus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createFolder } from './folder-actions'

const PALETTE_COLORS = [
  { name: 'Ardoise', hex: '#64748b' },
  { name: 'Rouge', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Ambre', hex: '#f59e0b' },
  { name: 'Vert', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Bleu', hex: '#2563eb' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#ec4899' },
]

export default function FolderCreateModal({ parentId }: { parentId?: string | null }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#64748b')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      await createFolder(name, selectedColor, parentId)
      setIsOpen(false)
      setName('')
      setSelectedColor('#64748b')
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du dossier")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'center', 
          backgroundColor: 'white', 
          color: 'var(--text)', 
          padding: '0.5rem 1rem', 
          borderRadius: '4px', 
          border: '1px solid var(--border)', 
          cursor: 'pointer',
          fontWeight: 500
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
      >
        <FolderPlus size={20} style={{ color: 'var(--primary)' }} />
        Nouveau dossier
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: '8px', 
            width: '100%', maxWidth: '450px', position: 'relative'
          }}>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={24} color="var(--text-muted)" />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Créer un nouveau dossier</h2>
            
            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nom du dossier *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required 
                  placeholder="Ex: Factures, Rapports, Photos..." 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Couleur</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {PALETTE_COLORS.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSelectedColor(color.hex)}
                      style={{
                        backgroundColor: color.hex,
                        height: '2.5rem',
                        borderRadius: '6px',
                        border: selectedColor === color.hex ? '3px solid #000' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                        transform: selectedColor === color.hex ? 'scale(1.05)' : 'none'
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="button outline">
                  Annuler
                </button>
                <button type="submit" disabled={isSaving} className="button primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
                  Créer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

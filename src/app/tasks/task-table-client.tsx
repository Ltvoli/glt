'use client'

import { useState } from 'react'
import { Archive, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { batchUpdateTaskStatus } from './actions'

export default function TaskTableClient({ tasks }: { tasks: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)

  const priorityBadges: Record<string, { bg: string, color: string, label: string }> = {
    HAUTE: { bg: '#fee2e2', color: '#991b1b', label: 'Haute' },
    NORMALE: { bg: '#dbeafe', color: '#1e40af', label: 'Normale' },
    BASSE: { bg: '#f1f5f9', color: '#475569', label: 'Basse' }
  }

  const statusLabels: Record<string, string> = {
    A_FAIRE: 'À faire',
    EN_COURS: 'En cours',
    EN_ATTENTE: 'En attente',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée'
  }

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(tasks.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBatchAction = async (status: string) => {
    if (selectedIds.length === 0) return
    setIsPending(true)
    try {
      await batchUpdateTaskStatus(selectedIds, status)
      setSelectedIds([])
    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'action de masse.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes overdue-blink {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .overdue-pulse {
          animation: overdue-blink 1.5s infinite ease-in-out;
        }
      `}</style>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={tasks.length > 0 && selectedIds.length === tasks.length}
                />
              </th>
              <th>Titre</th>
              <th>Livrable attendu</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Échéance</th>
              <th>Assigné à</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune tâche trouvée.
                </td>
              </tr>
            ) : (
              tasks.map(task => {
                const isOverdue = task.dueDate && 
                                  new Date(task.dueDate) < new Date() && 
                                  task.status !== 'TERMINEE' && 
                                  task.status !== 'ANNULEE'

                return (
                  <tr key={task.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(task.id)}
                        onChange={() => toggleSelect(task.id)}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/tasks/${task.id}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                          {task.title}
                        </Link>
                        {task.isRecurring && (
                          <span title={task.isTemplate ? "Modèle de tâche récurrente" : "Tâche générée par une récurrence"} style={{ cursor: 'help', fontSize: '0.875rem' }}>
                            🔁
                          </span>
                        )}
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {task.tags.map((t: any) => (
                            <span key={t.tag.id} style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{task.expectedDeliverable || '-'}</span>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        backgroundColor: '#f1f5f9', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 500 
                      }}>
                        {statusLabels[task.status] || task.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        backgroundColor: priorityBadges[task.priority]?.bg || '#f1f5f9',
                        color: priorityBadges[task.priority]?.color || '#475569',
                        display: 'inline-block'
                      }}>
                        {priorityBadges[task.priority]?.label || task.priority}
                      </span>
                    </td>
                    <td style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 600 : 'normal' }}>
                      {task.dueDate ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                          {isOverdue && (
                            <span className="overdue-pulse" title="Date d'échéance dépassée" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{task.assignee?.name || 'Non assigné'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          zIndex: 50,
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {selectedIds.length} sélectionnée(s)
          </span>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }}></div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleBatchAction('TERMINEE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <CheckCircle size={16} /> Marquer Terminée
            </button>
            <button 
              onClick={() => handleBatchAction('EN_ATTENTE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#d97706', borderColor: '#d97706' }}
            >
              <Clock size={16} /> Mettre en attente
            </button>
            <button 
              onClick={() => handleBatchAction('ANNULEE')}
              disabled={isPending}
              className="button outline"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)' }}
            >
              <Archive size={16} /> Annuler
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTask, deleteTask, addTask } from '../actions'
import { Trash2, Plus, Calendar, CheckSquare, Square, ChevronDown, ChevronRight, Clock, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

type TaskData = {
  id: string
  label: string
  status: string
  required: boolean
  assigneeUserId: string | null
  dueDate: Date | null
  comment: string | null
  histories?: {
    id: string
    action: string
    oldValue: string | null
    newValue: string | null
    createdAt: Date
    user: { firstName: string, lastName: string, avatarUrl: string | null }
  }[]
}

type UserData = {
  id: string
  name: string
}

type TaskEditorProps = {
  permanenceId: string
  sectionKey: string
  initialTasks: TaskData[]
  users: UserData[]
  isReadOnly: boolean
}

export default function TaskEditor({
  permanenceId,
  sectionKey,
  initialTasks,
  users,
  isReadOnly
}: TaskEditorProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks)
  const [newLabel, setNewLabel] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [newAssignee, setNewAssignee] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const handleStatusChange = async (taskId: string, currentStatus: string) => {
    if (isReadOnly) return
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'
    
    // Optimistic UI update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t))

    const res = await updateTask(permanenceId, taskId, { status: nextStatus as any })
    if (!res.success) {
      // rollback
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: currentStatus } : t))
      setError(res.error || 'Erreur lors de la modification.')
      toast.error(res.error || 'Erreur lors de la modification.')
    } else {
      toast.success(nextStatus === 'DONE' ? 'Tâche marquée comme terminée' : 'Tâche marquée comme à faire')
      router.refresh()
    }
  }

  const handleFieldChange = async (taskId: string, field: 'assigneeUserId' | 'comment' | 'status', value: any) => {
    if (isReadOnly) return
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t))

    const updateData: any = {}
    if (field === 'assigneeUserId') updateData.assigneeUserId = value || null
    if (field === 'comment') updateData.comment = value || null
    if (field === 'status') updateData.status = value

    const res = await updateTask(permanenceId, taskId, updateData)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la sauvegarde.')
      toast.error(res.error || 'Erreur lors de la sauvegarde.')
    } else {
      if (field === 'assigneeUserId') {
        const user = users.find(u => u.id === value)
        const name = user ? user.name : 'non assigné'
        toast.success(`Responsable mis à jour : ${name}`)
      } else if (field === 'status') {
        toast.success('Statut mis à jour avec succès')
      } else if (field === 'comment') {
        toast.success('Commentaire mis à jour avec succès')
      }
      router.refresh()
    }
  }

  const handleDelete = async (taskId: string) => {
    if (isReadOnly) return
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return

    const res = await deleteTask(permanenceId, taskId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la suppression.')
      toast.error(res.error || 'Erreur lors de la suppression.')
    } else {
      setTasks(tasks.filter(t => t.id !== taskId))
      toast.success('Tâche supprimée avec succès')
      router.refresh()
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    if (!newLabel.trim()) return

    setAdding(true)
    setError(null)
    const res = await addTask(permanenceId, sectionKey, newLabel, newRequired, newAssignee, newDueDate)
    if (!res.success) {
      setError(res.error || 'Erreur de création de tâche.')
      toast.error(res.error || 'Erreur lors de la création de la tâche.')
    } else {
      setNewLabel('')
      setNewRequired(false)
      setNewAssignee('')
      setNewDueDate('')
      toast.success('Tâche ajoutée avec succès')
      // Refetch via router
      router.refresh()
      // We also update state if we get response with data, but here page revalidation handles it
      setTimeout(() => {
        window.location.reload() // Force reload to fetch the new task easily
      }, 300)
    }
    setAdding(false)
  }

  return (
    <div>
      {error && (
        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {/* TÂCHES EXISTANTES */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Intitulé</th>
              <th style={{ width: '150px' }}>Responsable</th>
              <th style={{ width: '150px' }}>Échéance</th>
              <th>Statut détaillé</th>
              <th>Commentaire / Note</th>
              {!isReadOnly && <th style={{ width: '60px' }}></th>}
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 7 : 8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune tâche de préparation dans cette section.
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <React.Fragment key={t.id}>
                <tr style={{ backgroundColor: expandedTaskId === t.id ? '#f8fafc' : 'white', cursor: 'pointer' }} onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) {
                      return
                    }
                    setExpandedTaskId(expandedTaskId === t.id ? null : t.id)
                  }}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => handleStatusChange(t.id, t.status)}
                      style={{ background: 'none', border: 'none', cursor: isReadOnly ? 'default' : 'pointer', color: t.status === 'DONE' ? 'var(--success)' : 'var(--text-muted)' }}
                    >
                      {t.status === 'DONE' ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        textDecoration: t.status === 'DONE' ? 'line-through' : 'none',
                        color: t.status === 'DONE' ? 'var(--text-muted)' : 'inherit',
                        fontWeight: t.required ? 600 : 400
                      }}>
                        {t.label}
                      </span>
                      {t.required && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.1rem 0.3rem', borderRadius: '3px', textTransform: 'uppercase' }}>
                          Obligatoire
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      value={t.assigneeUserId || ''}
                      disabled={isReadOnly}
                      onChange={(e) => handleFieldChange(t.id, 'assigneeUserId', e.target.value)}
                      className="form-control"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                    >
                      <option value="">Non assigné</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      <Calendar size={12} />
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Aucune'}
                    </div>
                  </td>
                  <td>
                    <select
                      value={t.status}
                      disabled={isReadOnly}
                      onChange={(e) => handleFieldChange(t.id, 'status', e.target.value)}
                      className="form-control"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                    >
                      <option value="TODO">À faire</option>
                      <option value="IN_PROGRESS">En cours</option>
                      <option value="DONE">Terminé</option>
                      <option value="IMPOSSIBLE">Impossible</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      defaultValue={t.comment || ''}
                      disabled={isReadOnly}
                      placeholder="Ajouter une note..."
                      onBlur={(e) => handleFieldChange(t.id, 'comment', e.target.value)}
                      className="form-control"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                    />
                  </td>
                  {!isReadOnly && (
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="text-red-500 hover:text-red-700"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {expandedTaskId === t.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </td>
                </tr>
                {expandedTaskId === t.id && (
                  <tr>
                    <td colSpan={isReadOnly ? 7 : 8} style={{ padding: 0 }}>
                      <div style={{ padding: '1rem 3rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                        <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={14} /> Historique de la tâche
                        </h5>
                        
                        {(!t.histories || t.histories.length === 0) ? (
                          <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>Aucun historique disponible.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '15px', width: '2px', backgroundColor: '#e2e8f0' }}></div>
                            {t.histories.map((h, i) => (
                              <div key={h.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#64748b' }}>
                                  {h.user.avatarUrl ? (
                                    <img src={h.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <UserIcon size={14} />
                                  )}
                                </div>
                                <div style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                                      {h.user.firstName} {h.user.lastName}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      {new Date(h.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                                    {h.action === 'CREATED' && <span>A créé la tâche</span>}
                                    {h.action === 'STATUS_CHANGE' && <span>A passé le statut de <strong>{h.oldValue}</strong> à <strong>{h.newValue}</strong></span>}
                                    {h.action === 'ASSIGNEE_CHANGE' && <span>A changé l'assignation de <strong>{h.oldValue ? users.find(u => u.id === h.oldValue)?.name || h.oldValue : 'Personne'}</strong> à <strong>{h.newValue ? users.find(u => u.id === h.newValue)?.name || h.newValue : 'Personne'}</strong></span>}
                                    {h.action === 'COMMENT_CHANGE' && <span>A modifié le commentaire : <br/><em style={{ color: '#64748b' }}>"{h.newValue}"</em></span>}
                                    {h.action === 'LABEL_CHANGE' && <span>A renommé la tâche de <strong>{h.oldValue}</strong> à <strong>{h.newValue}</strong></span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FORMULAIRE D'AJOUT DE TÂCHE */}
      {!isReadOnly && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Ajouter une tâche personnalisée</h4>
          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div style={{ gridColumn: 'span 2' }}>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Nom de la tâche</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                placeholder="Ex: Contacter le correspondant local du journal Nice Matin"
                className="form-control"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Responsable</label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="form-control"
              >
                <option value="">Non assigné</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500">Date d'échéance (optionnel)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="form-control"
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Bloquante</span>
              </label>
              <button
                type="submit"
                disabled={adding}
                className="button"
                style={{ flex: 1 }}
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

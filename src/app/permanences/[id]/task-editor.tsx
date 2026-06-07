'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTask, deleteTask, addTask } from '../actions'
import { Trash2, Plus, Calendar, CheckSquare, Square } from 'lucide-react'

type TaskData = {
  id: string
  label: string
  status: string
  required: boolean
  assigneeUserId: string | null
  dueDate: Date | null
  comment: string | null
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
    } else {
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
    } else {
      router.refresh()
    }
  }

  const handleDelete = async (taskId: string) => {
    if (isReadOnly) return
    if (!confirm('Voulez-vous vraiment supprimer cette tâche ?')) return

    const res = await deleteTask(permanenceId, taskId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la suppression.')
    } else {
      setTasks(tasks.filter(t => t.id !== taskId))
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
    } else {
      setNewLabel('')
      setNewRequired(false)
      setNewAssignee('')
      setNewDueDate('')
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
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 6 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune tâche de préparation dans cette section.
                </td>
              </tr>
            ) : (
              tasks.map(t => (
                <tr key={t.id}>
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
                </tr>
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

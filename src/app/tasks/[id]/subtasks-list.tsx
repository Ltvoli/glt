'use client'

import { useState, useEffect } from 'react'
import { addSubtask, toggleSubtask } from './actions'
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react'

export default function SubtasksList({ taskId, initialSubtasks }: { taskId: string, initialSubtasks: any[] }) {
  const [subtasks, setSubtasks] = useState(initialSubtasks)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Sync state with server when initialSubtasks change (ex: from other clients or actions)
  useEffect(() => {
    setSubtasks(initialSubtasks)
  }, [initialSubtasks])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsAdding(true)
    const res = await addSubtask(taskId, newTitle)
    if (res.success && res.subtask) {
      setSubtasks([...subtasks, res.subtask])
      setNewTitle('')
    }
    setIsAdding(false)
  }

  const handleToggle = async (id: string, isCompleted: boolean) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, isCompleted } : s))
    await toggleSubtask(id, isCompleted)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {subtasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aucune sous-tâche.</p>
        ) : (
          subtasks.map(subtask => (
            <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  onClick={() => handleToggle(subtask.id, !subtask.isCompleted)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: subtask.isCompleted ? 'var(--success)' : 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {subtask.isCompleted ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
                <span style={{ 
                  textDecoration: subtask.isCompleted ? 'line-through' : 'none',
                  color: subtask.isCompleted ? 'var(--text-muted)' : 'var(--foreground)'
                }}>
                  {subtask.title}
                </span>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Supprimer cette sous-tâche ?')) {
                    setSubtasks(prev => prev.filter(s => s.id !== subtask.id))
                    const { deleteSubtask } = await import('./actions')
                    await deleteSubtask(subtask.id)
                  }
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.7 }}
                title="Supprimer la sous-tâche"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nouvelle sous-tâche..." 
          className="form-control"
          style={{ flex: 1, margin: 0 }}
        />
        <button type="submit" className="button outline" disabled={isAdding || !newTitle.trim()}>
          <Plus size={16} /> Ajouter
        </button>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { addSubtask, toggleSubtask } from './actions'
import { CheckSquare, Square, Plus } from 'lucide-react'

export default function SubtasksList({ taskId, initialSubtasks }: { taskId: string, initialSubtasks: any[] }) {
  const [subtasks, setSubtasks] = useState(initialSubtasks)
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsAdding(true)
    const res = await addSubtask(taskId, newTitle)
    if (res.success) {
      setNewTitle('')
      // Idealement on récupèrerait l'objet créé, mais vu que la page sera revalidée par le serveur,
      // la donnée fraîche sera redescendue. Pour un meilleur UX, on pourrait ajouter un stub localement.
      // Par simplicité, on compte sur le revalidatePath.
    }
    setIsAdding(false)
  }

  const handleToggle = async (id: string, isCompleted: boolean) => {
    // Optimistic UI
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
            <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                onClick={() => handleToggle(subtask.id, !subtask.isCompleted)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: subtask.isCompleted ? 'var(--success)' : 'var(--text-muted)', padding: 0 }}
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
          style={{ flex: 1 }}
        />
        <button type="submit" className="button outline" disabled={isAdding || !newTitle.trim()}>
          <Plus size={16} /> Ajouter
        </button>
      </form>
    </div>
  )
}

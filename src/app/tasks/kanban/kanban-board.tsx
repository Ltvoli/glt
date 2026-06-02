'use client'

import { useState, useTransition } from 'react'
import { updateTaskStatus } from '../actions'
import { CalendarDays, AlertCircle } from 'lucide-react'

const COLUMNS_CONFIG = [
  { id: 'A_FAIRE', label: 'À faire', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'EN_COURS', label: 'En cours', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'EN_ATTENTE', label: 'En attente', color: '#8b5cf6', bg: '#f3e8ff' },
  { id: 'TERMINEE', label: 'Terminée', color: '#10b981', bg: '#d1fae5' },
  { id: 'ANNULEE', label: 'Annulée', color: '#64748b', bg: '#f1f5f9' },
]

export default function KanbanBoard({ initialColumns }: { initialColumns: Record<string, any[]> }) {
  const [columns, setColumns] = useState(initialColumns)
  const [isPending, startTransition] = useTransition()

  const moveTask = (taskId: string, sourceColId: string, destColId: string) => {
    if (sourceColId === destColId) return

    // Mise à jour optimiste
    const taskIndex = columns[sourceColId].findIndex(t => t.id === taskId)
    const task = columns[sourceColId][taskIndex]
    
    setColumns(prev => {
      const newCols = { ...prev }
      newCols[sourceColId] = prev[sourceColId].filter(t => t.id !== taskId)
      newCols[destColId] = [...prev[destColId], { ...task, status: destColId }]
      return newCols
    })

    // Appel serveur
    startTransition(async () => {
      await updateTaskStatus(taskId, destColId)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
      {COLUMNS_CONFIG.map(col => (
        <div key={col.id} style={{ 
          flex: '0 0 300px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          maxHeight: '100%'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: col.color }}></span>
              {col.label}
            </h3>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.5rem', borderRadius: '12px' }}>
              {columns[col.id].length}
            </span>
          </div>

          <div style={{ padding: '0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {columns[col.id].map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['TERMINEE', 'ANNULEE'].includes(task.status)
              
              return (
                <div key={task.id} style={{ 
                  backgroundColor: 'white', 
                  padding: '1rem', 
                  borderRadius: '6px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: isOverdue ? '1px solid var(--danger)' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: task.priority === 'HAUTE' ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {task.priority}
                    </span>
                    {isOverdue && <AlertCircle size={14} color="var(--danger)" />}
                  </div>
                  
                  <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    <a href={`/tasks/${task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {task.title}
                    </a>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <span>{task.assignee?.name || 'Non assigné'}</span>
                    {task.dueDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                        <CalendarDays size={12} />
                        {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {/* Actions Rapides pour déplacer */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {COLUMNS_CONFIG.map(destCol => {
                      if (destCol.id === col.id) return null
                      return (
                        <button 
                          key={destCol.id}
                          onClick={() => moveTask(task.id, col.id, destCol.id)}
                          disabled={isPending}
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.125rem 0.35rem',
                            border: 'none',
                            backgroundColor: destCol.bg,
                            color: destCol.color,
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          → {destCol.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

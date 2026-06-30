'use client'

import { useState, useTransition } from 'react'
import { updateTaskStatus } from '../actions'
import { CalendarDays, AlertCircle, GripVertical } from 'lucide-react'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS_CONFIG = [
  { id: 'A_FAIRE', label: 'À faire', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'EN_COURS', label: 'En cours', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'EN_ATTENTE', label: 'En attente', color: '#8b5cf6', bg: '#f3e8ff' },
  { id: 'TERMINEE', label: 'Terminée', color: '#10b981', bg: '#d1fae5' },
  { id: 'ANNULEE', label: 'Annulée', color: '#64748b', bg: '#f1f5f9' },
]

function SortableTask({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['TERMINEE', 'ANNULEE'].includes(task.status)

  return (
    <div ref={setNodeRef} style={{ ...style, backgroundColor: 'white', padding: '1rem', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: isOverdue ? '1px solid var(--danger)' : '1px solid #e2e8f0', position: 'relative' }}>
      <div {...attributes} {...listeners} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', cursor: 'grab', color: '#cbd5e1' }}>
        <GripVertical size={16} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', paddingRight: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: task.priority === 'HAUTE' ? 'var(--danger)' : 'var(--text-muted)' }}>
          {task.priority}
        </span>
        {isOverdue && <AlertCircle size={14} color="var(--danger)" />}
      </div>
      
      <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <a href={`/tasks/${task.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {task.title}
        </a>
        {task.isRecurring && (
          <span title="Tâche récurrente">🔁</span>
        )}
      </div>
      
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {task.tags.map((t: any) => (
            <span key={t.tag.id} style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
              {t.tag.name}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>{task.assignee?.name || 'Non assigné'}</span>
        {task.dueDate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--danger)' : 'inherit' }}>
            <CalendarDays size={12} />
            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  )
}

function DroppableColumn({ id, title, color, tasks }: { id: string, title: string, color: string, tasks: any[] }) {
  // Instead of sortable column, we use useSortable for the column itself so it can act as a drop target when empty
  const { setNodeRef } = useSortable({ id, data: { type: 'Column' } })
  
  return (
    <div ref={setNodeRef} style={{ flex: '0 0 300px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', maxHeight: '100%' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }}></span>
          {title}
        </h3>
        <span style={{ fontSize: '0.75rem', backgroundColor: '#e2e8f0', padding: '0.125rem 0.5rem', borderRadius: '12px' }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ padding: '0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <SortableTask key={task.id} task={task} />)}
        </SortableContext>
      </div>
    </div>
  )
}

export default function KanbanBoard({ initialColumns }: { initialColumns: Record<string, any[]> }) {
  const [columns, setColumns] = useState(initialColumns)
  const [isPending, startTransition] = useTransition()
  const [activeTask, setActiveTask] = useState<any | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: any) => {
    const { active } = event
    const id = active.id
    // Find active task
    for (const col of Object.values(columns)) {
      const task = col.find(t => t.id === id)
      if (task) {
        setActiveTask(task)
        break
      }
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Find source and dest columns
    let sourceColId = ''
    let destColId = ''

    for (const [colId, tasks] of Object.entries(columns)) {
      if (tasks.some(t => t.id === activeId)) sourceColId = colId
      if (colId === overId || tasks.some(t => t.id === overId)) destColId = colId
    }

    if (!sourceColId || !destColId || sourceColId === destColId) return

    // Optimistic update
    const taskIndex = columns[sourceColId].findIndex(t => t.id === activeId)
    const task = columns[sourceColId][taskIndex]

    setColumns(prev => {
      const newCols = { ...prev }
      newCols[sourceColId] = prev[sourceColId].filter(t => t.id !== activeId)
      newCols[destColId] = [...prev[destColId], { ...task, status: destColId }]
      return newCols
    })

    startTransition(async () => {
      await updateTaskStatus(activeId, destColId)
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: '1rem', height: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
        {COLUMNS_CONFIG.map(col => (
          <DroppableColumn key={col.id} id={col.id} title={col.label} color={col.color} tasks={columns[col.id] || []} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '6px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', opacity: 0.8 }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {activeTask.title}
              {activeTask.isRecurring && <span>🔁</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {activeTask.assignee?.name || 'Non assigné'}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

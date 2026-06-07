'use client'

import { useTransition, useState } from 'react'
import { reorderPages, togglePageStatus } from './page-actions'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type PageData = {
  id: string
  slug: string
  label: string
  isVisible: boolean
  order: number
  module: { label: string } | null
}

function SortableItem({ page, handleToggle, isPending }: { page: PageData, handleToggle: (id: string, v: boolean) => void, isPending: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 mb-2 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{page.label}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <code>{page.slug}</code>
            {page.module && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {page.module.label}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <button
          role="switch"
          aria-checked={page.isVisible}
          disabled={isPending}
          onClick={() => handleToggle(page.id, page.isVisible)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            page.isVisible ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              page.isVisible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default function PageList({ initialPages }: { initialPages: PageData[] }) {
  const [pages, setPages] = useState(initialPages)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        const newArray = arrayMove(items, oldIndex, newIndex)
        
        // Save to DB
        startTransition(async () => {
          const updates = newArray.map((p, index) => ({ id: p.id, order: index }))
          const res = await reorderPages(updates)
          if (res.error) {
            setPages(items) // revert
            setError(res.error)
          }
        })
        
        return newArray
      })
    }
  }

  const handleToggle = (pageId: string, currentStatus: boolean) => {
    setPages(pages.map(p => p.id === pageId ? { ...p, isVisible: !currentStatus } : p))
    setError(null)
    
    startTransition(async () => {
      const res = await togglePageStatus(pageId, !currentStatus)
      if (res.error) {
        setPages(initialPages)
        setError(res.error)
      }
    })
  }

  return (
    <div>
      {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={pages.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {pages.map(page => (
            <SortableItem 
              key={page.id} 
              page={page} 
              handleToggle={handleToggle}
              isPending={isPending}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

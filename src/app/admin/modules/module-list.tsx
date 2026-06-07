'use client'

import { useTransition, useState } from 'react'
import { toggleModuleStatus } from './module-actions'

type ModuleData = {
  id: string
  key: string
  label: string
  isActive: boolean
}

export default function ModuleList({ initialModules }: { initialModules: ModuleData[] }) {
  const [modules, setModules] = useState(initialModules)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (moduleId: string, currentStatus: boolean) => {
    // Optimistic update
    setModules(modules.map(m => m.id === moduleId ? { ...m, isActive: !currentStatus } : m))
    setError(null)
    
    startTransition(async () => {
      const res = await toggleModuleStatus(moduleId, !currentStatus)
      if (res.error) {
        // Revert on error
        setModules(initialModules)
        setError(res.error)
      }
    })
  }

  return (
    <div>
      {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
      
      <div className="space-y-4">
        {modules.map(mod => (
          <div key={mod.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{mod.label}</h3>
              <p className="text-sm text-gray-500">Clé système : {mod.key}</p>
            </div>
            <div className="flex items-center">
              <button
                role="switch"
                aria-checked={mod.isActive}
                disabled={isPending}
                onClick={() => handleToggle(mod.id, mod.isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  mod.isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mod.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

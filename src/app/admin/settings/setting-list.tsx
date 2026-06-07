'use client'

import { useActionState, useState } from 'react'
import { createSetting, updateSetting } from './setting-actions'
import { SettingType } from '@prisma/client'

type SettingData = {
  key: string
  value: string
  type: SettingType
  label: string
  category: string
  updatedAt: Date
}

const initialState = { success: false, error: '' }

export default function SettingList({ initialSettings }: { initialSettings: SettingData[] }) {
  const [settings, setSettings] = useState(initialSettings)
  const [createState, formAction, isPendingCreate] = useActionState(createSetting, initialState)

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const grouped = settings.reduce((acc, s) => {
    const g = s.category || 'general'
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {} as Record<string, SettingData[]>)

  const handleSave = async (key: string) => {
    setIsUpdating(true)
    setUpdateError(null)
    const res = await updateSetting(key, editValue)
    if (res.error) {
      setUpdateError(res.error)
    } else {
      setSettings(settings.map(s => s.key === key ? { ...s, value: editValue } : s))
      setEditingKey(null)
    }
    setIsUpdating(false)
  }

  return (
    <div>
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[var(--border-color)]">
        <h3 className="font-semibold mb-4 text-[var(--text-color)]">Ajouter un nouveau paramètre technique</h3>
        <form action={formAction} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Clé (ex: auth.session_ttl)</label>
            <input type="text" name="key" required className="w-full px-3 py-2 border rounded bg-[var(--input-bg)] text-[var(--text-color)]" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Valeur</label>
            <input type="text" name="value" required className="w-full px-3 py-2 border rounded bg-[var(--input-bg)] text-[var(--text-color)]" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Type</label>
            <select name="type" className="w-full px-3 py-2 border rounded bg-[var(--input-bg)] text-[var(--text-color)]">
              <option value="STRING">STRING</option>
              <option value="NUMBER">NUMBER</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="JSON">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Label descriptif</label>
            <input type="text" name="label" required className="w-full px-3 py-2 border rounded bg-[var(--input-bg)] text-[var(--text-color)]" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Catégorie (ex: general, auth, email, rgpd)</label>
            <input type="text" name="category" className="w-full px-3 py-2 border rounded bg-[var(--input-bg)] text-[var(--text-color)]" defaultValue="general" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-300">
              <input type="checkbox" name="isSecret" value="true" className="w-4 h-4" />
              <span className="text-sm font-medium">Sensible (Masqué / Secret)</span>
            </label>
            <button type="submit" disabled={isPendingCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1 transition-colors">
              Ajouter
            </button>
          </div>
        </form>
        {createState?.error && <p className="text-red-500 text-sm mt-2">{createState.error}</p>}
      </div>

      {updateError && <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded">{updateError}</div>}

      <div className="space-y-8">
        {Object.entries(grouped).map(([category, categorySettings]) => (
          <div key={category} className="border border-[var(--border-color)] rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
            <h3 className="text-lg font-bold mb-3 border-b pb-2 text-[var(--text-color)] uppercase tracking-wider">{category}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Clé</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {categorySettings.map(setting => (
                    <tr key={setting.key}>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">{setting.key}</div>
                        {setting.label && <div className="text-xs text-gray-500 dark:text-gray-400">{setting.label}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {editingKey === setting.key ? (
                          <input 
                            type="text" 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full border px-2 py-1 rounded text-black bg-white"
                            autoFocus
                          />
                        ) : (
                          <span className={setting.type === 'SECRET' ? "italic text-gray-400 dark:text-gray-500" : "font-mono text-[var(--text-color)]"}>
                            {setting.type === 'SECRET' ? '••••••••' : setting.value}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded text-xs">{setting.type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingKey === setting.key ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleSave(setting.key)} disabled={isUpdating} className="text-green-600 font-medium hover:underline">Sauver</button>
                            <button onClick={() => setEditingKey(null)} disabled={isUpdating} className="text-gray-500 hover:underline">Annuler</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingKey(setting.key); setEditValue(setting.value); }} className="text-blue-600 hover:underline">Modifier</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

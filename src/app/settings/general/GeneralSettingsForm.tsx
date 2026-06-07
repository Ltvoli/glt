'use client'

import { useState } from 'react'
import { saveAppSetting } from '../actions'

export default function GeneralSettingsForm({ initialData }: { initialData: Record<string, string> }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    
    try {
      await saveAppSetting('SITE_NAME', formData.get('SITE_NAME') as string, 'GENERAL', 'Nom du site')
      await saveAppSetting('OFFICE_NAME', formData.get('OFFICE_NAME') as string, 'GENERAL', 'Nom du bureau')
      await saveAppSetting('DEPUTY_NAME', formData.get('DEPUTY_NAME') as string, 'GENERAL', 'Nom du député')
      await saveAppSetting('OFFICE_ADDRESS', formData.get('OFFICE_ADDRESS') as string, 'GENERAL', 'Adresse du bureau')
      await saveAppSetting('GENERIC_EMAIL', formData.get('GENERIC_EMAIL') as string, 'GENERAL', 'Email générique')
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '600px' }}>
      {success && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: 'var(--success)', borderRadius: '8px', marginBottom: '1.5rem' }}>
          Paramètres enregistrés avec succès.
        </div>
      )}

      <div className="form-group">
        <label htmlFor="SITE_NAME">Nom du site</label>
        <input type="text" id="SITE_NAME" name="SITE_NAME" className="form-control" defaultValue={initialData['SITE_NAME'] || 'Bureau Parlementaire'} />
      </div>

      <div className="form-group">
        <label htmlFor="OFFICE_NAME">Nom du bureau</label>
        <input type="text" id="OFFICE_NAME" name="OFFICE_NAME" className="form-control" defaultValue={initialData['OFFICE_NAME'] || ''} />
      </div>

      <div className="form-group">
        <label htmlFor="DEPUTY_NAME">Nom du député</label>
        <input type="text" id="DEPUTY_NAME" name="DEPUTY_NAME" className="form-control" defaultValue={initialData['DEPUTY_NAME'] || ''} />
      </div>
      
      <div className="form-group">
        <label htmlFor="OFFICE_ADDRESS">Adresse du bureau</label>
        <textarea id="OFFICE_ADDRESS" name="OFFICE_ADDRESS" className="form-control" defaultValue={initialData['OFFICE_ADDRESS'] || ''} rows={3} />
      </div>
      
      <div className="form-group">
        <label htmlFor="GENERIC_EMAIL">Email générique</label>
        <input type="email" id="GENERIC_EMAIL" name="GENERIC_EMAIL" className="form-control" defaultValue={initialData['GENERIC_EMAIL'] || ''} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}

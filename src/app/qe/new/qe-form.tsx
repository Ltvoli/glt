'use client'

import { useActionState, useState } from 'react'
import { createQE } from '../actions'
import { renderQeField } from '../dynamic-qe-fields'
import Autocomplete from '@/components/ui/autocomplete'

const initialState = {
  error: ''
}

const MINISTRIES = [
  "Premier ministre",
  "Ministère de l'Économie, des Finances et de l'Industrie",
  "Ministère de l'Intérieur",
  "Ministère du Travail et de l'Emploi",
  "Ministère de la Transition écologique, de l'Énergie, du Climat et de la Prévention des risques",
  "Ministère de la Justice",
  "Ministère des Armées et des Anciens combattants",
  "Ministère du Partenariat avec les territoires et de la Décentralisation",
  "Ministère de l'Agriculture, de la Souveraineté alimentaire et de la Forêt",
  "Ministère de l'Éducation nationale",
  "Ministère de l'Enseignement supérieur et de la Recherche",
  "Ministère de la Culture",
  "Ministère de la Santé et de l'Accès aux soins",
  "Ministère des Solidarités, de l'Autonomie et de l'Égalité entre les femmes et les hommes",
  "Ministère du Logement et de la Rénovation urbaine",
  "Ministère des Sports, de la Jeunesse et de la Vie associative",
  "Ministère de l'Europe et des Affaires étrangères",
  "Ministère des Outre-mer",
  "Autre"
]

export default function QEForm({ users, contacts, tasks, mails, dictionary = [], fieldConfig = {} }: { users: {id: string; name: string}[], contacts: {id: string; firstName: string; lastName: string}[], tasks: {id: string; title: string}[], mails?: {id: string; subject: string; reference: string}[], dictionary?: any[], fieldConfig?: Record<string, any> }) {
  const [state, formAction, isPending] = useActionState(createQE, initialState)
  
  const contactOptions = contacts.map((c: any) => ({
    value: c.id,
    label: `${c.lastName} ${c.firstName}${c.city ? ` (${c.city})` : ''}`
  }))

  const [anNumber, setAnNumber] = useState('')
  const [legislature, setLegislature] = useState('17')
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')

  // Controlled inputs for scraped data
  const [title, setTitle] = useState('')
  const [ministry, setMinistry] = useState('')
  const [content, setContent] = useState('')

  const handleScrape = async () => {
    if (!anNumber) return
    setIsScraping(true)
    setScrapeError('')
    try {
      const res = await fetch(`/api/qe/scrape?number=${anNumber}&legislature=${legislature}`)
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setTitle(data.title || '')
      
      // Auto select ministry if it matches
      if (data.ministry) {
        const matched = MINISTRIES.find(m => m.toLowerCase().includes(data.ministry.toLowerCase()) || data.ministry.toLowerCase().includes(m.toLowerCase()))
        if (matched) setMinistry(matched)
        else setMinistry('Autre') // Or custom logic
      }
      
      setContent(data.text || '')
    } catch (err: any) {
      setScrapeError(err.message)
    } finally {
      setIsScraping(false)
    }
  }

  const infoFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Informations' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const trackingFields = Object.entries(fieldConfig || {})
    .map(([key, f]) => ({ key, ...(f as any) }))
    .filter((f: any) => f.section === 'Suivi' && f.isVisible)
    .sort((a: any, b: any) => a.order - b.order)

  const stateProps = {
    anNumber,
    setAnNumber,
    title,
    setTitle,
    ministry,
    setMinistry,
    content,
    setContent
  }

  return (
    <form action={formAction}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Informations principales</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={legislature} onChange={e => setLegislature(e.target.value)} className="form-control" style={{ width: 'auto', padding: '0.25rem' }}>
            <option value="17">17ème législature</option>
            <option value="16">16ème législature</option>
            <option value="15">15ème législature</option>
          </select>
          <input 
            type="text" 
            placeholder="N° (ex: 1234)" 
            className="form-control" 
            style={{ width: '120px', padding: '0.25rem' }} 
            value={anNumber}
            onChange={e => setAnNumber(e.target.value)}
          />
          <button type="button" className="button outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={handleScrape} disabled={isScraping || !anNumber}>
            {isScraping ? 'Recherche...' : 'Auto-compléter (AN)'}
          </button>
        </div>
      </div>
      
      {scrapeError && <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{scrapeError}</div>}
      
      {infoFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {infoFields.map((f: any) => renderQeField(f.key, f.label, {}, users, dictionary, stateProps))}
        </div>
      )}

      {trackingFields.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Suivi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {trackingFields.map((f: any) => renderQeField(f.key, f.label, {}, users, dictionary, stateProps))}
          </div>
        </>
      )}

      {/* Hidden fallbacks for required fields if they are not visible in config */}
      {!fieldConfig?.title?.isVisible && (
        <input type="hidden" name="title" value={title || 'Sans titre'} />
      )}
      {!fieldConfig?.type?.isVisible && (
        <input type="hidden" name="type" value="QE" />
      )}
      {!fieldConfig?.ministry?.isVisible && (
        <input type="hidden" name="ministry" value={ministry || 'Autre'} />
      )}

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Liaisons (Optionnel)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="contactId">Lier à un Contact</label>
          <Autocomplete 
            options={contactOptions} 
            defaultValue="" 
            name="contactId" 
            placeholder="Rechercher un contact..." 
          />
          <small style={{ color: 'var(--text-muted)' }}>Lier cette question au lanceur d&apos;alerte.</small>
        </div>
        <div className="form-group">
          <label htmlFor="taskId">Lier à une Tâche</label>
          <select id="taskId" name="taskId" className="form-control" defaultValue="">
            <option value="">Aucune tâche</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <small style={{ color: 'var(--text-muted)' }}>Lier à la tâche de rédaction préparatoire.</small>
        </div>
        <div className="form-group">
          <label htmlFor="mailId">Lier à un Courrier</label>
          <select id="mailId" name="mailId" className="form-control" defaultValue="">
            <option value="">Aucun courrier</option>
            {mails?.map(m => (
              <option key={m.id} value={m.id}>{m.reference} - {m.subject}</option>
            ))}
          </select>
          <small style={{ color: 'var(--text-muted)' }}>Lier à la demande écrite initiale.</small>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="attachment">Pièce jointe initiale (Optionnel)</label>
        <input type="file" id="attachment" name="attachment" className="form-control" style={{ padding: '0.5rem' }} />
        <small style={{ color: 'var(--text-muted)' }}>Exemple : brouillon de la question, argumentaire...</small>
      </div>

      {state.error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="button" disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer la question'}
        </button>
      </div>
    </form>
  )
}

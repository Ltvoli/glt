'use client'

import { useActionState, useState } from 'react'
import { createQE } from '../actions'

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

export default function QEForm({ users, contacts, tasks, mails, dictionary = [] }: { users: {id: string; name: string}[], contacts: {id: string; firstName: string; lastName: string}[], tasks: {id: string; title: string}[], mails?: {id: string; subject: string; reference: string}[], dictionary?: any[] }) {
  const [state, formAction, isPending] = useActionState(createQE, initialState)
  
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

  return (
    <form action={formAction}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
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
      
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="title">Titre de la question *</label>
        <input type="text" id="title" name="title" className="form-control" required placeholder="Ex: Conséquences de la réforme X sur le territoire..." value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label htmlFor="type">Type de question *</label>
          <select id="type" name="type" className="form-control" required defaultValue={dictionary.find(d => d.type === 'QE_TYPE' && d.isDefault)?.code || "QE"}>
            {dictionary.filter(d => d.type === 'QE_TYPE').map(d => (
              <option key={d.code} value={d.code}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ministry">Ministère interrogé *</label>
          <select id="ministry" name="ministry" className="form-control" required value={ministry} onChange={e => setMinistry(e.target.value)}>
            <option value="" disabled>Sélectionner un ministère</option>
            {MINISTRIES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="anNumber">Numéro AN</label>
          <input type="text" id="anNumber" name="anNumber" className="form-control" value={anNumber} onChange={e => setAnNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="theme">Thématique</label>
          <select id="theme" name="theme" className="form-control" defaultValue="">
            <option value="" disabled>Sélectionner un thème</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Environnement">Environnement</option>
            <option value="Sécurité">Sécurité</option>
            <option value="Logement">Logement</option>
            <option value="Transports">Transports</option>
            <option value="Santé">Santé</option>
            <option value="Éducation">Éducation</option>
            <option value="Économie">Économie</option>
            <option value="Associations">Associations</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="assigneeId">Collaborateur en charge</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue="">
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="followUpDescription">Retour à faire (Optionnel)</label>
          <input type="text" id="followUpDescription" name="followUpDescription" className="form-control" placeholder="Ex: Prévenir le maire dès réception de la réponse..." />
        </div>
        <div className="form-group">
          <label htmlFor="followUpDueDate">Échéance du retour</label>
          <input type="date" id="followUpDueDate" name="followUpDueDate" className="form-control" />
        </div>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Contenu</h3>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="content">Texte de la question</label>
        <textarea id="content" name="content" className="form-control" rows={10} placeholder="Rédigez le contenu de la question ici..." value={content} onChange={e => setContent(e.target.value)}></textarea>
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="attachment">Pièce jointe initiale (Optionnel)</label>
        <input type="file" id="attachment" name="attachment" className="form-control" style={{ padding: '0.5rem' }} />
        <small style={{ color: 'var(--text-muted)' }}>Exemple : brouillon de la question, argumentaire...</small>
      </div>

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label htmlFor="notes">Notes internes (Non publiées)</label>
        <textarea id="notes" name="notes" className="form-control" rows={3} placeholder="Contexte, acteur local à prévenir lors de la publication..."></textarea>
      </div>

      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Liaisons (Optionnel)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label htmlFor="contactId">Lier à un Contact</label>
          <select id="contactId" name="contactId" className="form-control" defaultValue="">
            <option value="">Aucun contact</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>{c.lastName} {c.firstName}</option>
            ))}
          </select>
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

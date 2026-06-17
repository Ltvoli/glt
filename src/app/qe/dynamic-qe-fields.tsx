import React from 'react'

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

export function renderQeField(
  fieldKey: string,
  label: string,
  qe: any = {},
  users: any[] = [],
  dictionary: any[] = [],
  stateProps?: {
    anNumber?: string
    setAnNumber?: (val: string) => void
    title?: string
    setTitle?: (val: string) => void
    ministry?: string
    setMinistry?: (val: string) => void
    content?: string
    setContent?: (val: string) => void
  }
) {
  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'anNumber' && (
        <div className="form-group">
          <label htmlFor="anNumber">{label}</label>
          <input
            type="text"
            id="anNumber"
            name="anNumber"
            className="form-control"
            value={stateProps?.anNumber !== undefined ? stateProps.anNumber : (qe.anNumber || '')}
            onChange={e => stateProps?.setAnNumber?.(e.target.value)}
          />
        </div>
      )}

      {fieldKey === 'title' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="title">{label} *</label>
          <input
            type="text"
            id="title"
            name="title"
            className="form-control"
            required
            placeholder="Ex: Conséquences de la réforme X sur le territoire..."
            value={stateProps?.title !== undefined ? stateProps.title : (qe.title || '')}
            onChange={e => stateProps?.setTitle?.(e.target.value)}
          />
        </div>
      )}

      {fieldKey === 'type' && (
        <div className="form-group">
          <label htmlFor="type">{label} *</label>
          <select id="type" name="type" className="form-control" required defaultValue={qe.type || dictionary.find(d => d.type === 'QE_TYPE' && d.isDefault)?.code || "QE"}>
            {dictionary.filter(d => d.type === 'QE_TYPE').map(d => (
              <option key={d.code} value={d.code}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {fieldKey === 'ministry' && (
        <div className="form-group">
          <label htmlFor="ministry">{label} *</label>
          <select
            id="ministry"
            name="ministry"
            className="form-control"
            required
            value={stateProps?.ministry !== undefined ? stateProps.ministry : (qe.ministry || '')}
            onChange={e => stateProps?.setMinistry?.(e.target.value)}
          >
            <option value="" disabled={stateProps?.ministry === undefined}>Sélectionner un ministère</option>
            {MINISTRIES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {fieldKey === 'theme' && (
        <div className="form-group">
          <label htmlFor="theme">{label}</label>
          <select id="theme" name="theme" className="form-control" defaultValue={qe.theme || ''}>
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
      )}

      {fieldKey === 'content' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="content">{label}</label>
          <textarea
            id="content"
            name="content"
            className="form-control"
            rows={10}
            placeholder="Rédigez le contenu de la question ici..."
            value={stateProps?.content !== undefined ? stateProps.content : (qe.content || '')}
            onChange={e => stateProps?.setContent?.(e.target.value)}
          />
        </div>
      )}

      {fieldKey === 'notes' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="notes">{label}</label>
          <textarea id="notes" name="notes" className="form-control" rows={3} defaultValue={qe.notes || ''} placeholder="Contexte, acteur local à prévenir lors de la publication..." />
        </div>
      )}

      {fieldKey === 'author' && (
        <div className="form-group">
          <label htmlFor="author">{label}</label>
          <input type="text" id="author" name="author" className="form-control" defaultValue={qe.author || ''} />
        </div>
      )}

      {fieldKey === 'coSigners' && (
        <div className="form-group">
          <label htmlFor="coSigners">{label}</label>
          <input type="text" id="coSigners" name="coSigners" className="form-control" defaultValue={qe.coSigners || ''} />
        </div>
      )}

      {fieldKey === 'depositDate' && (
        <div className="form-group">
          <label htmlFor="depositDate">{label}</label>
          <input type="date" id="depositDate" name="depositDate" className="form-control" defaultValue={qe.depositDate ? new Date(qe.depositDate).toISOString().split('T')[0] : ''} />
        </div>
      )}

      {fieldKey === 'responseDate' && (
        <div className="form-group">
          <label htmlFor="responseDate">{label}</label>
          <input type="date" id="responseDate" name="responseDate" className="form-control" defaultValue={qe.responseDate ? new Date(qe.responseDate).toISOString().split('T')[0] : ''} />
        </div>
      )}

      {fieldKey === 'concernedPerson' && (
        <div className="form-group">
          <label htmlFor="concernedPerson">{label}</label>
          <input type="text" id="concernedPerson" name="concernedPerson" className="form-control" defaultValue={qe.concernedPerson || ''} />
        </div>
      )}

      {fieldKey === 'followUpDueDate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
          <div className="form-group">
            <label htmlFor="followUpDescription">Retour à faire (Optionnel)</label>
            <input type="text" id="followUpDescription" name="followUpDescription" className="form-control" defaultValue={qe.followUpDescription || ''} placeholder="Ex: Prévenir le maire dès réception de la réponse..." />
          </div>
          <div className="form-group">
            <label htmlFor="followUpDueDate">{label}</label>
            <input type="date" id="followUpDueDate" name="followUpDueDate" className="form-control" defaultValue={qe.followUpDueDate ? new Date(qe.followUpDueDate).toISOString().split('T')[0] : ''} />
          </div>
        </div>
      )}

      {fieldKey === 'responseContent' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="responseContent">{label}</label>
          <textarea id="responseContent" name="responseContent" className="form-control" rows={10} defaultValue={qe.responseContent || ''} placeholder="Collez le texte de la réponse officielle ici..." />
        </div>
      )}

      {fieldKey === 'assigneeId' && (
        <div className="form-group">
          <label htmlFor="assigneeId">{label}</label>
          <select id="assigneeId" name="assigneeId" className="form-control" defaultValue={qe.assigneeId || ''}>
            <option value="">Non assigné</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}
    </React.Fragment>
  )
}

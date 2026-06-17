'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveSynthesisAction, signSynthesisAction } from '../../actions'
import { Printer, Edit, CheckSquare, AlertCircle } from 'lucide-react'

type SynthesisData = {
  attentionPoints: string | null
  merchantProgram: string | null
  phoningTopics: string | null
  recommendations: string | null
  signedByUserId: string | null
  signedAt: Date | null
  signedByUser?: { name: string } | null
}

type SyntheseClientProps = {
  permanenceId: string
  synthesis: Omit<SynthesisData, 'signedByUser'> & { signedByUser?: { name: string } | null } | null
  prefillAttention: string
  prefillMerchant: string
  prefillPhoning: string
  isReadOnly: boolean
  hasValidatePermission: boolean
}

export default function SyntheseClient({
  permanenceId,
  synthesis,
  prefillAttention,
  prefillMerchant,
  prefillPhoning,
  isReadOnly,
  hasValidatePermission
}: SyntheseClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states initialized with existing synthesis or prefill values
  const [attentionPoints, setAttentionPoints] = useState(synthesis?.attentionPoints || prefillAttention)
  const [merchantProgram, setMerchantProgram] = useState(synthesis?.merchantProgram || prefillMerchant)
  const [phoningTopics, setPhoningTopics] = useState(synthesis?.phoningTopics || prefillPhoning)
  const [recommendations, setRecommendations] = useState(synthesis?.recommendations || '')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await saveSynthesisAction(permanenceId, {
      attentionPoints,
      merchantProgram,
      phoningTopics,
      recommendations
    })

    if (!res.success) {
      setError(res.error || 'Erreur lors de l\'enregistrement.')
    } else {
      setSuccess('Synthèse enregistrée avec succès.')
      router.refresh()
    }
    setLoading(false)
  }

  const handleSign = async () => {
    if (!hasValidatePermission) return
    if (!confirm('Voulez-vous signer numériquement cette synthèse ? Cette action est irréversible.')) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await signSynthesisAction(permanenceId)
    if (!res.success) {
      setError(res.error || 'Erreur lors de la signature.')
    } else {
      setSuccess('Synthèse signée avec succès par le Député.')
      router.refresh()
    }
    setLoading(false)
  }

  const isSigned = !!synthesis?.signedAt

  return (
    <div>
      {/* ALERTS */}
      {error && (
        <div className="hide-on-print" style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="hide-on-print" style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#d1fae5', borderRadius: '6px' }}>
          {success}
        </div>
      )}

      {/* SIGNATURE BANNER */}
      {isSigned && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #10b981' }}>
          <div>
            <h4 style={{ fontWeight: 'bold', fontSize: '1rem' }}>✓ Synthèse validée et signée par le Député</h4>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              Signataire : {synthesis?.signedByUser?.name} le {synthesis?.signedAt ? new Date(synthesis.signedAt).toLocaleDateString('fr-FR') : ''} à {synthesis?.signedAt ? new Date(synthesis.signedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="button outline hide-on-print"
            style={{ backgroundColor: 'white', borderColor: '#10b981', color: '#065f46' }}
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      )}

      {/* SYNTHESIS FORM */}
      <form onSubmit={handleSave} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--foreground)' }}>Récapitulatif de la permanence</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Ces champs sont pré-remplis avec les données saisies dans les sections.</p>
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">1. Points d'attention & Signalements citoyens</label>
          <textarea
            value={attentionPoints}
            disabled={isReadOnly || isSigned}
            onChange={(e) => setAttentionPoints(e.target.value)}
            rows={4}
            className="form-control"
            placeholder="Saisissez les points d'attention particuliers..."
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">2. Programme de visite & Commerces</label>
          <textarea
            value={merchantProgram}
            disabled={isReadOnly || isSigned}
            onChange={(e) => setMerchantProgram(e.target.value)}
            rows={4}
            className="form-control"
            placeholder="Programme de visite des commerces locaux..."
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">3. Sujets Phoning émergeants</label>
          <textarea
            value={phoningTopics}
            disabled={isReadOnly || isSigned}
            onChange={(e) => setPhoningTopics(e.target.value)}
            rows={4}
            className="form-control"
            placeholder="Sujets et thématiques phoning émergeants..."
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-semibold mb-1 text-gray-700">4. Recommandations de l'équipe</label>
          <textarea
            value={recommendations}
            disabled={isReadOnly || isSigned}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={3}
            className="form-control"
            placeholder="Saisissez les recommandations ou suites à donner..."
          />
        </div>

        {/* BUTTONS PANEL */}
        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            {!isSigned && hasValidatePermission && (
              <button
                type="button"
                onClick={handleSign}
                disabled={loading}
                className="button"
                style={{ backgroundColor: 'var(--success)' }}
              >
                <CheckSquare size={16} /> Signer la synthèse
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="button outline"
            >
              <Printer size={16} /> Version imprimable (PDF)
            </button>
            
            {!isSigned && !isReadOnly && (
              <button
                type="submit"
                disabled={loading}
                className="button"
                style={{ minWidth: '150px' }}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

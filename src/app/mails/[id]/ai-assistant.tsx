'use client'

import { useState, useTransition } from 'react'
import { 
  Sparkles, 
  BrainCircuit, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Check, 
  EyeOff, 
  Eye, 
  CheckCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  UserCheck
} from 'lucide-react'
import { analyzeMailCaseAction, generateMailResponsesAction, toggleAiAssistantAction } from '../actions'
import { toast } from 'sonner'

interface MailAiAnalysis {
  metadata?: {
    expediteur_nom?: string | null
    expediteur_qualite?: "administré" | "institutionnel" | "association" | "entreprise" | "élu" | "autre"
    expediteur_coordonnees?: {
      adresse?: string | null
      email?: string | null
      telephone?: string | null
    }
    date_courrier?: string | null
    objet?: string
    commune?: string | null
    dans_circonscription?: "oui" | "non" | "incertain"
  }
  analyse?: {
    type_courrier?: "demande_intervention" | "reclamation" | "invitation" | "demande_rdv" | "demande_soutien" | "autre"
    resume?: string
    demande_principale?: string
    demandes_secondaires?: string[]
    urgence?: "faible" | "moyenne" | "élevée"
    releve_competence_depute?: "oui" | "non" | "partiellement"
    limites_a_signaler?: string[]
    donnees_personnelles_sensibles?: boolean
    elements_manquants?: string[]
  }
  pistes_reponse?: {
    id: number
    intitule: string
    nature: "accuse_reception" | "reponse_administre" | "courrier_intervention" | "saisine_ministre" | "question_ecrite" | "reorientation" | "invitation_reponse" | "prise_rdv" | "prise_de_position" | "transmission_interne"
    destinataire: string
    description: string
    faisabilite: string
    delai_estime: string
    ce_que_cela_engage: string
    recommandee: boolean
  }[]
}

interface AiAssistantProps {
  mailId: string
  aiAnalysis: any // JsonValue
  aiSuggestions: any // JsonValue
  hideAiAssistant: boolean
  hasAttachments: boolean
}

export default function AiAssistant({ 
  mailId, 
  aiAnalysis, 
  aiSuggestions, 
  hideAiAssistant,
  hasAttachments
}: AiAssistantProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingStep, setLoadingStep] = useState<string>('')
  
  // Custom instructions
  const [customInstruction, setCustomInstruction] = useState('')
  
  // Suggestions UI state
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<number[]>([])
  const [expandedSuggestionIds, setExpandedSuggestionIds] = useState<Record<number, boolean>>({})

  // Cast analysis and suggestions safely
  const analysis = aiAnalysis as MailAiAnalysis | null
  const suggestions = (aiSuggestions || []) as any[]

  // Toggle suggestion selection
  const handleToggleSelect = (id: number) => {
    setSelectedSuggestionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Toggle suggestion accordion expansion
  const handleToggleExpand = (id: number) => {
    setExpandedSuggestionIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Run analysis
  const handleRunAnalysis = () => {
    startTransition(async () => {
      setLoadingStep("Lecture et analyse du courrier par Gemini 2.5...")
      try {
        const res = await analyzeMailCaseAction(mailId)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success("Analyse du courrier effectuée avec succès !")
          // Select recommended suggestions by default after analysis
          if (res.success && analysis?.pistes_reponse) {
            const recommended = analysis.pistes_reponse
              .filter(p => p.recommandee)
              .map(p => p.id)
            setSelectedSuggestionIds(recommended)
          }
        }
      } catch (err: any) {
        toast.error("Erreur technique lors de l'analyse : " + err.message)
      } finally {
        setLoadingStep('')
      }
    })
  }

  // Generate replies
  const handleGenerateReplies = () => {
    if (selectedSuggestionIds.length === 0) {
      toast.error("Veuillez sélectionner au moins une piste de réponse.")
      return
    }

    startTransition(async () => {
      setLoadingStep("Génération des brouillons de réponse conformes...")
      try {
        const res = await generateMailResponsesAction(mailId, selectedSuggestionIds, customInstruction)
        if (res.error) {
          toast.error(res.error)
        } else {
          toast.success(`Génération réussie : ${res.count} brouillon(s) créé(s) !`)
          setCustomInstruction('')
          setSelectedSuggestionIds([])
        }
      } catch (err: any) {
        toast.error("Erreur lors de la génération : " + err.message)
      } finally {
        setLoadingStep('')
      }
    })
  }

  // Toggle absolute opposition
  const handleToggleOpposition = (hide: boolean) => {
    startTransition(async () => {
      try {
        const res = await toggleAiAssistantAction(mailId, hide)
        if ('error' in res && res.error) {
          toast.error(res.error)
        } else {
          toast.success(hide ? "Assistant IA masqué" : "Assistant IA activé")
        }
      } catch (err: any) {
        toast.error("Erreur de modification : " + err.message)
      }
    })
  }

  // Render Quiet State if hidden
  if (hideAiAssistant) {
    return (
      <div className="card" style={{ 
        border: '1px dashed var(--border)',
        backgroundColor: '#f8fafc',
        padding: '1.25rem',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <EyeOff size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>L'assistant IA est masqué pour ce courrier.</span>
        </div>
        <button 
          onClick={() => handleToggleOpposition(false)}
          className="button outline"
          disabled={isPending}
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          Activer l'assistant IA
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* CARD HEADER / MAIN BOX */}
      <div className="card" style={{ 
        border: '1px solid var(--border)', 
        borderRadius: '12px', 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        position: 'relative'
      }}>
        {/* Glowing Gradient Bar for Premium AI look */}
        <div style={{ 
          height: '4px', 
          background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 50%, #c7d2fe 100%)' 
        }} />

        <div style={{ padding: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5' }}>
              <Sparkles size={20} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: 'var(--foreground)' }}>
                Assistant IA
              </h3>
            </div>
            
            <button 
              onClick={() => handleToggleOpposition(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              title="Masquer l'assistant pour ce courrier"
              disabled={isPending}
            >
              <EyeOff size={14} />
              Ignorer l'IA
            </button>
          </div>

          {/* Loading State Overlay */}
          {isPending && (
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              backgroundColor: 'rgba(255, 255, 255, 0.85)', 
              zIndex: 10, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '2rem',
              backdropFilter: 'blur(2px)'
            }}>
              <Loader2 size={36} className="animate-spin" style={{ color: '#4f46e5', marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600, color: '#1e1b4b', fontSize: '0.95rem', textAlign: 'center' }}>
                {loadingStep || "Traitement en cours..."}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Gemini 2.5 Flash analyse et rédige
              </p>
            </div>
          )}

          {/* ─── CASE A: NO ANALYSIS YET ─── */}
          {!analysis && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                backgroundColor: '#e0e7ff', 
                color: '#4f46e5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem' 
              }}>
                <BrainCircuit size={24} />
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Courrier non analysé
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {hasAttachments 
                  ? "Ce courrier possède un document joint. L'IA peut lire le contenu textuel ou l'image scannée pour extraire les données et générer des réponses."
                  : "Aucun contenu extrait. L'IA peut analyser le sujet et les notes pour vous assister."}
              </p>
              <button 
                onClick={handleRunAnalysis}
                className="button"
                style={{ width: '100%', gap: '0.5rem' }}
                disabled={isPending}
              >
                <Sparkles size={16} />
                Lancer l'analyse par l'IA
              </button>
            </div>
          )}

          {/* ─── CASE B: ANALYZED ─── */}
          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Badges Panel: Urgence & Compétence */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Urgence Badge */}
                {analysis.analyse?.urgence && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 
                      analysis.analyse.urgence === 'élevée' ? '#fee2e2' : 
                      analysis.analyse.urgence === 'moyenne' ? '#ffedd5' : '#f1f5f9',
                    color: 
                      analysis.analyse.urgence === 'élevée' ? '#b91c1c' : 
                      analysis.analyse.urgence === 'moyenne' ? '#c2410c' : '#475569'
                  }}>
                    Urgence : {analysis.analyse.urgence.toUpperCase()}
                  </span>
                )}

                {/* Compétence Député Badge */}
                {analysis.analyse?.releve_competence_depute && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 
                      analysis.analyse.releve_competence_depute === 'oui' ? '#d1fae5' : 
                      analysis.analyse.releve_competence_depute === 'partiellement' ? '#fef3c7' : '#fee2e2',
                    color: 
                      analysis.analyse.releve_competence_depute === 'oui' ? '#065f46' : 
                      analysis.analyse.releve_competence_depute === 'partiellement' ? '#92400e' : '#991b1b'
                  }} title="Détermination de la compétence légale de l'élu sur ce sujet">
                    <UserCheck size={12} />
                    Compétence électorale : {
                      analysis.analyse.releve_competence_depute === 'oui' ? 'Oui' :
                      analysis.analyse.releve_competence_depute === 'partiellement' ? 'Partielle' : 'Hors rôle électoral'
                    }
                  </span>
                )}

                {/* Données Sensibles */}
                {analysis.analyse?.donnees_personnelles_sensibles && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fef3c7'
                  }} title="Contient des données à caractère de santé, opinions politiques, ou religieuses">
                    ⚠️ Données sensibles RGPD
                  </span>
                )}
              </div>

              {/* Résumé de l'analyse */}
              {analysis.analyse?.resume && (
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px' 
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Résumé du courrier
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.5, margin: 0 }}>
                    {analysis.analyse.resume}
                  </p>
                </div>
              )}

              {/* Limites à signaler / Séparation des Pouvoirs */}
              {analysis.analyse?.limites_a_signaler && analysis.analyse.limites_a_signaler.length > 0 && (
                <div style={{ 
                  backgroundColor: '#fef2f2', 
                  borderLeft: '4px solid #ef4444', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#991b1b', marginBottom: '0.25rem' }}>
                    <ShieldAlert size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Limites réglementaires (Attention)</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#7f1d1d' }}>
                    {analysis.analyse.limites_a_signaler.map((lim, idx) => (
                      <li key={idx} style={{ marginBottom: '0.15rem' }}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Éléments manquants */}
              {analysis.analyse?.elements_manquants && analysis.analyse.elements_manquants.length > 0 && (
                <div style={{ 
                  backgroundColor: '#fffbeb', 
                  borderLeft: '4px solid #d97706', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#92400e', marginBottom: '0.25rem' }}>
                    <HelpCircle size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Pièces ou détails manquants</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#78350f' }}>
                    {analysis.analyse.elements_manquants.map((el, idx) => (
                      <li key={idx} style={{ marginBottom: '0.15rem' }}>{el}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions de réponses */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>Pistes de réponses suggérées ({suggestions.length})</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {suggestions.map((sug) => {
                    const isSelected = selectedSuggestionIds.includes(sug.id)
                    const isExpanded = expandedSuggestionIds[sug.id] || false

                    return (
                      <div 
                        key={sug.id} 
                        style={{
                          border: `1px solid ${isSelected ? '#818cf8' : 'var(--border)'}`,
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                          transition: 'all 0.2s',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Summary Header of Suggestion */}
                        <div 
                          style={{ 
                            padding: '0.75rem 1rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                          onClick={() => handleToggleExpand(sug.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            {/* Checkbox */}
                            <div 
                              onClick={(e) => {
                                e.stopPropagation() // Don't trigger accordion expand
                                handleToggleSelect(sug.id)
                              }}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: `2px solid ${isSelected ? '#4f46e5' : '#cbd5e1'}`,
                                backgroundColor: isSelected ? '#4f46e5' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.85rem', 
                                fontWeight: 600, 
                                color: isSelected ? '#312e81' : '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {sug.intitule}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Nature : {sug.nature.replace(/_/g, ' ')} • Pour : {sug.destinataire}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {sug.recommandee && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 'bold', 
                                backgroundColor: '#e0e7ff', 
                                color: '#4f46e5', 
                                padding: '0.15rem 0.35rem', 
                                borderRadius: '4px' 
                              }}>
                                Recommandé
                              </span>
                            )}
                            <div style={{ color: 'var(--text-muted)' }}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Collapsed Description details */}
                        {isExpanded && (
                          <div style={{ 
                            padding: '0.75rem 1rem 1rem', 
                            borderTop: '1px solid var(--border)',
                            backgroundColor: isSelected ? 'rgba(245, 243, 255, 0.5)' : '#fafafa',
                            fontSize: '0.8rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div>
                              <strong style={{ color: '#475569' }}>Description :</strong>
                              <p style={{ margin: '0.2rem 0 0', color: '#334155', lineHeight: 1.4 }}>{sug.description}</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <div>
                                <strong style={{ color: '#475569' }}>Faisabilité :</strong>
                                <span style={{ display: 'block', color: '#334155' }}>{sug.faisabilite}</span>
                              </div>
                              <div>
                                <strong style={{ color: '#475569' }}>Délai estimé :</strong>
                                <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={12} color="var(--text-muted)" />
                                  {sug.delai_estime}
                                </span>
                              </div>
                            </div>
                            <div style={{ marginTop: '0.25rem' }}>
                              <strong style={{ color: '#475569' }}>Engagement juridique/politique :</strong>
                              <span style={{ display: 'block', color: '#991b1b', fontWeight: 500 }}>{sug.ce_que_cela_engage}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Box: Custom Instruction and Generation */}
              <div style={{ 
                borderTop: '1px solid var(--border)', 
                paddingTop: '1.25rem',
                marginTop: '0.5rem'
              }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="custom-instruction" style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>Consignes particulières (facultatif)</span>
                  </label>
                  <textarea
                    id="custom-instruction"
                    className="form-control"
                    placeholder="Ex: 'Utiliser un ton très courtois', 'Mentionner que nous l'avons déjà vu', 'Insister sur l'urgence auprès du préfet'..."
                    rows={2.5}
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    style={{ resize: 'vertical', fontSize: '0.8rem' }}
                    disabled={isPending}
                  />
                </div>

                <button
                  onClick={handleGenerateReplies}
                  className="button"
                  style={{ 
                    width: '100%', 
                    gap: '0.5rem',
                    backgroundColor: selectedSuggestionIds.length === 0 ? '#e2e8f0' : '#4f46e5',
                    color: selectedSuggestionIds.length === 0 ? 'var(--text-muted)' : '#ffffff',
                    cursor: selectedSuggestionIds.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isPending || selectedSuggestionIds.length === 0}
                >
                  <CheckCircle size={16} />
                  Générer les brouillons ({selectedSuggestionIds.length})
                </button>
                {selectedSuggestionIds.length === 0 && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.35rem' }}>
                    Sélectionnez au moins une piste de réponse ci-dessus pour générer des brouillons.
                  </p>
                )}
              </div>

              {/* Rerun analysis if they want to refresh */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleRunAnalysis}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    padding: '0.25rem',
                    fontWeight: 500
                  }}
                  disabled={isPending}
                >
                  Recalculer les analyses & pistes IA
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

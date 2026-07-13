'use client'

import React, { useState, useTransition, useEffect, useCallback } from 'react'
import Papa from 'papaparse'
import { 
  createApiKeyAction, 
  revokeApiKeyAction,
  createWebhookAction, 
  updateWebhookAction, 
  deleteWebhookAction, 
  testWebhookAction,
  getAuditLogsAction,
  getAllAuditLogsForExportAction,
  getBrevoSettingsAction,
  saveBrevoSettingsAction,
  AuditLogResult
} from './actions'
import { 
  KeyRound, 
  Webhook, 
  FileClock,
  Plus, 
  Trash2, 
  Check, 
  X, 
  Loader2, 
  Copy, 
  Info, 
  Play, 
  RefreshCw, 
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle
} from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  expiresAt: Date | null
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

type WebhookType = {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  secret: string
  lastCalledAt: Date | null
  createdAt: Date
}

type IntegrationsClientProps = {
  users: { id: string; email: string; firstName: string; lastName: string }[]
  initialKeys: ApiKey[]
  initialWebhooks: WebhookType[]
}

const SCOPES_OPTIONS = [
  { key: 'contacts:read', label: 'Lecture des contacts' },
  { key: 'contacts:write', label: 'Écriture des contacts' },
  { key: 'tasks:read', label: 'Lecture des tâches' },
  { key: 'tasks:write', label: 'Écriture des tâches' },
  { key: 'audit:read', label: 'Lecture des logs d\'audit' }
]

const EVENTS_OPTIONS = [
  { key: 'contact.created', label: 'Création de contact' },
  { key: 'contact.updated', label: 'Modification de contact' },
  { key: 'contact.deleted', label: 'Suppression de contact' },
  { key: 'task.created', label: 'Création de tâche' },
  { key: 'task.updated', label: 'Modification de tâche' }
]

export default function IntegrationsClient({
  users,
  initialKeys,
  initialWebhooks
}: IntegrationsClientProps) {
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'audit' | 'brevo'>('keys')
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [webhooks, setWebhooks] = useState<WebhookType[]>(initialWebhooks)
  
  // Brevo Settings State
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('')
  const [brevoSenderName, setBrevoSenderName] = useState('')
  const [brevoSignature, setBrevoSignature] = useState('')
  const [isSavingBrevo, setIsSavingBrevo] = useState(false)

  // Api Keys Form State
  const [keyName, setKeyName] = useState('')
  const [keyScopes, setKeyScopes] = useState<string[]>([])
  const [keyExpiresDays, setKeyExpiresDays] = useState<number>(30)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  // Webhooks Form State
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [webhookTestResults, setWebhookTestResults] = useState<Record<string, { success: boolean; status?: number; body?: string; error?: string }>>({})

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogResult[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPages, setLogsPages] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsFilterAction, setLogsFilterAction] = useState('')
  const [logsFilterEntityType, setLogsFilterEntityType] = useState('')
  const [logsFilterUserId, setLogsFilterUserId] = useState('')
  const [logsLoading, setLogsLoading] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [logsPending, startLogsTransition] = useTransition()
  const [successBanner, setSuccessBanner] = useState('')
  const [errorBanner, setErrorBanner] = useState('')

  // Load Brevo config on mount
  useEffect(() => {
    getBrevoSettingsAction().then(res => {
      if (res.success && res.data) {
        setBrevoApiKey(res.data.apiKey)
        setBrevoSenderEmail(res.data.senderEmail)
        setBrevoSenderName(res.data.senderName)
        setBrevoSignature(res.data.signature)
      }
    })
  }, [])

  const fetchAuditLogs = useCallback(async (targetPage: number) => {
    setLogsLoading(true)
    const res = await getAuditLogsAction(targetPage, 25, {
      action: logsFilterAction || undefined,
      entityType: logsFilterEntityType || undefined,
      userId: logsFilterUserId || undefined
    })
    
    if (res.success && res.data) {
      setLogs(res.data.logs)
      setLogsTotal(res.data.totalCount)
      setLogsPages(res.data.pagesCount)
    }
    setLogsLoading(false)
  }, [logsFilterAction, logsFilterEntityType, logsFilterUserId])

  // Load Audit logs dynamically on filter or page change
  useEffect(() => {
    if (activeTab === 'audit') {
      setTimeout(() => {
        fetchAuditLogs(logsPage)
      }, 0)
    }
  }, [activeTab, logsPage, fetchAuditLogs])

  // API Key scope toggling
  const handleScopeToggle = (scope: string, checked: boolean) => {
    if (checked) {
      setKeyScopes(prev => [...prev, scope])
    } else {
      setKeyScopes(prev => prev.filter(s => s !== scope))
    }
  }

  // Create API Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return

    setErrorBanner('')
    setSuccessBanner('')
    setNewlyCreatedKey(null)

    startTransition(async () => {
      const res = await createApiKeyAction(keyName, keyScopes, keyExpiresDays > 0 ? keyExpiresDays : null)
      if (res.success && res.data) {
        setSuccessBanner('Clé API créée. Veuillez la copier immédiatement.')
        setNewlyCreatedKey(res.data.rawKey)
        
        // Add to list
        const mockNewKey: ApiKey = {
          id: Math.random().toString(),
          name: keyName.trim(),
          keyPrefix: res.data.rawKey.substring(0, 15),
          scopes: keyScopes,
          expiresAt: keyExpiresDays > 0 ? new Date(Date.now() + keyExpiresDays * 24 * 60 * 60 * 1000) : null,
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date()
        }
        setKeys(prev => [mockNewKey, ...prev])
        
        // Reset form
        setKeyName('')
        setKeyScopes([])
      } else {
        setErrorBanner(res.error || 'Erreur de création')
      }
    })
  }

  // Revoke Key
  const handleRevokeKey = async (keyId: string, name: string) => {
    if (!confirm(`Révoquer la clé API "${name}" ? Cette action est irréversible.`)) return
    
    setErrorBanner('')
    setSuccessBanner('')
    const res = await revokeApiKeyAction(keyId)
    if (res.success) {
      setSuccessBanner(`Clé API "${name}" révoquée.`)
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, revokedAt: new Date() } : k))
    } else {
      setErrorBanner(res.error || 'Erreur lors de la révocation')
    }
  }

  // Webhook event toggling
  const handleEventToggle = (evt: string, checked: boolean) => {
    if (checked) {
      setWebhookEvents(prev => [...prev, evt])
    } else {
      setWebhookEvents(prev => prev.filter(e => e !== evt))
    }
  }

  // Save / Update Webhook
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhookName.trim() || !webhookUrl.trim() || webhookEvents.length === 0) return

    setErrorBanner('')
    setSuccessBanner('')

    startTransition(async () => {
      if (editingWebhook) {
        // Edit webhook
        const res = await updateWebhookAction(editingWebhook.id, webhookName, webhookUrl, webhookEvents, editingWebhook.isActive)
        if (res.success) {
          setSuccessBanner(`Webhook "${webhookName}" mis à jour.`)
          setWebhooks(prev => prev.map(w => 
            w.id === editingWebhook.id 
              ? { ...w, name: webhookName.trim(), url: webhookUrl.trim(), events: webhookEvents } 
              : w
          ))
          setEditingWebhook(null)
          setWebhookName('')
          setWebhookUrl('')
          setWebhookEvents([])
        } else {
          setErrorBanner(res.error || 'Erreur lors de la mise à jour')
        }
      } else {
        // Create webhook
        const res = await createWebhookAction(webhookName, webhookUrl, webhookEvents)
        if (res.success && res.data) {
          setSuccessBanner(`Webhook "${webhookName}" enregistré avec succès.`)
          // Reload page to get created webhook secret
          window.location.reload()
        } else {
          setErrorBanner(res.error || 'Erreur lors de la création')
        }
      }
    })
  }

  // Toggle Webhook active status
  const handleToggleWebhookStatus = async (webhook: WebhookType, checked: boolean) => {
    setErrorBanner('')
    setSuccessBanner('')
    const res = await updateWebhookAction(webhook.id, webhook.name, webhook.url, webhook.events, checked)
    if (res.success) {
      setSuccessBanner(`Statut du webhook "${webhook.name}" modifié.`)
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, isActive: checked } : w))
    } else {
      setErrorBanner(res.error || 'Erreur lors du changement de statut')
    }
  }

  // Test Webhook
  const handleTestWebhook = async (webhookId: string) => {
    setWebhookTestResults(prev => ({ ...prev, [webhookId]: { success: false, error: 'Ping en cours...' } }))
    
    const res = await testWebhookAction(webhookId)
    if (res.success && res.data) {
      setWebhookTestResults(prev => ({ 
        ...prev, 
        [webhookId]: { 
          success: true, 
          status: res.data?.status, 
          body: res.data?.body 
        } 
      }))
      setWebhooks(prev => prev.map(w => w.id === webhookId ? { ...w, lastCalledAt: new Date() } : w))
    } else {
      setWebhookTestResults(prev => ({ 
        ...prev, 
        [webhookId]: { 
          success: false, 
          error: res.error || 'Échec de connexion' 
        } 
      }))
    }
  }

  // Delete Webhook
  const handleDeleteWebhook = async (webhook: WebhookType) => {
    if (!confirm(`Supprimer définitivement le webhook "${webhook.name}" ?`)) return
    
    setErrorBanner('')
    setSuccessBanner('')
    startTransition(async () => {
      const res = await deleteWebhookAction(webhook.id)
      if (res.success) {
        setSuccessBanner(`Webhook "${webhook.name}" supprimé.`)
        setWebhooks(prev => prev.filter(w => w.id !== webhook.id))
        if (editingWebhook?.id === webhook.id) {
          setEditingWebhook(null)
          setWebhookName('')
          setWebhookUrl('')
          setWebhookEvents([])
        }
      } else {
        setErrorBanner(res.error || 'Erreur lors de la suppression')
      }
    })
  }

  // Export Audit Logs to CSV using papaparse
  const handleExportAuditLogs = () => {
    setErrorBanner('')
    setSuccessBanner('')
    
    startLogsTransition(async () => {
      const res = await getAllAuditLogsForExportAction({
        action: logsFilterAction || undefined,
        entityType: logsFilterEntityType || undefined,
        userId: logsFilterUserId || undefined
      })

      if (res.success && res.data) {
        const rows = res.data.map(log => ({
          'Date': new Date(log.createdAt).toLocaleString(),
          'Action': log.action,
          'Entité': log.entityType,
          'ID Entité': log.entityId || '',
          'Utilisateur': log.userName,
          'Email Utilisateur': log.userEmail,
          'Adresse IP': log.ip || '',
          'Détails': JSON.stringify(log.details)
        }))

        const csv = Papa.unparse(rows)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setSuccessBanner('Export CSV généré avec succès.')
      } else {
        setErrorBanner(res.error || 'Impossible de générer l\'export.')
      }
    })
  }

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copié dans le presse-papiers !')
  }

  return (
    <div>
      {/* Alerts */}
      {successBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <Check size={18} /> {successBanner}
        </div>
      )}
      {errorBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dadce0', fontWeight: '500' }}>
          <X size={18} /> {errorBanner}
        </div>
      )}

      {/* Navigation horizontal tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('keys')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: '600',
            color: activeTab === 'keys' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'keys' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-0.6rem',
            fontSize: '0.875rem'
          }}
        >
          <KeyRound size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> Clés API
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: '600',
            color: activeTab === 'webhooks' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'webhooks' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-0.6rem',
            fontSize: '0.875rem'
          }}
        >
          <Webhook size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> Webhooks
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: '600',
            color: activeTab === 'audit' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-0.6rem',
            fontSize: '0.875rem'
          }}
        >
          <FileClock size={16} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'text-bottom' }} /> Audit & Logs
        </button>
        <button
          onClick={() => setActiveTab('brevo')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: '600',
            color: activeTab === 'brevo' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'brevo' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-0.6rem',
            fontSize: '0.875rem'
          }}
        >
          ✉️ Brevo
        </button>
      </div>

      {/* Tab: Keys */}
      {activeTab === 'keys' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Keys list */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              Clés API Actives
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th>Nom</th>
                    <th>Préfixe</th>
                    <th>Scopes</th>
                    <th>Expiration</th>
                    <th>Dernière utilisation</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        Aucune clé API configurée.
                      </td>
                    </tr>
                  ) : (
                    keys.map(key => {
                      const isRevoked = key.revokedAt !== null
                      const isExpired = key.expiresAt && new Date() > new Date(key.expiresAt)
                      const isActive = !isRevoked && !isExpired

                      return (
                        <tr key={key.id} style={{ borderBottom: '1px solid var(--border)', opacity: isActive ? 1 : 0.65 }}>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--foreground)' }}>{key.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Créée le {new Date(key.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {key.keyPrefix}...
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {key.scopes.map(s => (
                                <span key={s} style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            {key.expiresAt ? (
                              <span style={{ color: isExpired ? '#dc2626' : 'inherit' }}>
                                {new Date(key.expiresAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Jamais</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Jamais utilisée'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isActive ? (
                              <button
                                onClick={() => handleRevokeKey(key.id, key.name)}
                                className="button danger outline"
                                style={{ padding: '0.25rem 0.5rem', height: '28px', fontSize: '0.8rem' }}
                                title="Révoquer"
                              >
                                Révoquer
                              </button>
                            ) : (
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: '600', 
                                color: isRevoked ? '#dc2626' : '#b45309',
                                backgroundColor: isRevoked ? '#fef2f2' : '#fffbeb',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '12px'
                              }}>
                                {isRevoked ? 'Révoquée' : 'Expirée'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Form & newly created key display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Display raw key once */}
            {newlyCreatedKey && (
              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#065f46', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={16} /> Clé créée avec succès !
                </h4>
                <p style={{ color: '#065f46', fontSize: '0.75rem', margin: '0 0 1rem 0' }}>
                  Copiez cette clé maintenant. Pour des raisons de sécurité, elle ne sera plus jamais affichée dans le futur.
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    className="form-control"
                    value={newlyCreatedKey}
                    style={{ fontSize: '0.8rem', fontFamily: 'monospace', backgroundColor: 'white', borderColor: '#a7f3d0' }}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    className="button"
                    style={{ backgroundColor: '#10b981', color: 'white', padding: '0 0.75rem', height: '36px' }}
                    title="Copier"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Create Form */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Créer une clé API
              </h3>

              <form onSubmit={handleCreateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Nom de la clé
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Ex: Clé Qomon Staging, Linear Bot"
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                    Permissions (Scopes)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {SCOPES_OPTIONS.map(opt => (
                      <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={keyScopes.includes(opt.key)}
                          onChange={e => handleScopeToggle(opt.key, e.target.checked)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Expiration de la clé
                  </label>
                  <select
                    className="form-control"
                    value={keyExpiresDays}
                    onChange={e => setKeyExpiresDays(Number(e.target.value))}
                  >
                    <option value={30}>30 Jours</option>
                    <option value={90}>90 Jours</option>
                    <option value={365}>1 An</option>
                    <option value={0}>Pas d'expiration (Infini)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="button"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '36px', marginTop: '0.5rem' }}
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Générer la clé
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Tab: Webhooks */}
      {activeTab === 'webhooks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Webhooks list */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              Webhooks Configurés
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {webhooks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', margin: 0 }}>
                  Aucun webhook configuré.
                </p>
              ) : (
                webhooks.map(wh => {
                  const testRes = webhookTestResults[wh.id]

                  return (
                    <div
                      key={wh.id}
                      style={{
                        padding: '1.25rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: wh.isActive ? 'white' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Name & Active State Toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: wh.isActive ? 'var(--foreground)' : 'var(--text-muted)' }}>
                            {wh.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.75rem', fontFamily: 'monospace' }}>
                            Secret : {wh.secret}
                          </span>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>
                          <input
                            type="checkbox"
                            checked={wh.isActive}
                            onChange={e => handleToggleWebhookStatus(wh, e.target.checked)}
                          />
                          Webhook actif
                        </label>
                      </div>

                      {/* URL Display */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          readOnly
                          className="form-control"
                          value={wh.url}
                          style={{ fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: '#f1f5f9', height: '30px' }}
                        />
                        <button
                          onClick={() => copyToClipboard(wh.url)}
                          className="button outline"
                          style={{ height: '30px', padding: '0 0.5rem' }}
                          title="Copier l'URL"
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      {/* Events listed */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                          Événements :
                        </span>
                        {wh.events.map(e => (
                          <span key={e} style={{ fontSize: '0.7rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: '600' }}>
                            {e}
                          </span>
                        ))}
                      </div>

                      {/* Called date & response mock test */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {wh.lastCalledAt ? `Dernier appel : ${new Date(wh.lastCalledAt).toLocaleString()}` : 'Jamais appelé'}
                        </span>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleTestWebhook(wh.id)}
                            className="button outline"
                            style={{ height: '28px', padding: '0 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title="Envoyer un payload ping de test"
                          >
                            <Play size={12} /> Tester
                          </button>
                          <button
                            onClick={() => {
                              setEditingWebhook(wh)
                              setWebhookName(wh.name)
                              setWebhookUrl(wh.url)
                              setWebhookEvents(wh.events)
                            }}
                            className="button outline"
                            style={{ height: '28px', padding: '0 0.5rem', fontSize: '0.8rem' }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh)}
                            disabled={isPending}
                            className="button danger outline"
                            style={{ height: '28px', padding: '0 0.5rem', fontSize: '0.8rem' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Test result display */}
                      {testRes && (
                        <div style={{ 
                          padding: '0.75rem', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontFamily: 'monospace',
                          backgroundColor: testRes.success ? '#eff6ff' : '#fef2f2',
                          border: testRes.success ? '1px solid #bfdbfe' : '1px solid #fecaca',
                          color: testRes.success ? '#1e40af' : '#991b1b',
                          marginTop: '0.25rem',
                          wordBreak: 'break-all'
                        }}>
                          {testRes.error ? (
                            <div><strong>Erreur :</strong> {testRes.error}</div>
                          ) : (
                            <div>
                              <div><strong>Statut HTTP :</strong> {testRes.status}</div>
                              <div><strong>Réponse :</strong> {testRes.body || 'Aucun contenu renvoyé'}</div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right side: Webhook Creation Form */}
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: '1rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{editingWebhook ? 'Modifier le webhook' : 'Ajouter un webhook'}</span>
              {editingWebhook && (
                <button
                  onClick={() => {
                    setEditingWebhook(null)
                    setWebhookName('')
                    setWebhookUrl('')
                    setWebhookEvents([])
                  }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </h3>

            <form onSubmit={handleSaveWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Nom / Description
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="Ex: Synchronisation Qomon, Slack Bot"
                  value={webhookName}
                  onChange={e => setWebhookName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  URL de destination (HTTPS obligatoire)
                </label>
                <input
                  type="url"
                  className="form-control"
                  required
                  placeholder="https://api.monservice.com/webhook"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem' }}>
                  Événements déclencheurs
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {EVENTS_OPTIONS.map(opt => (
                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(opt.key)}
                        onChange={e => handleEventToggle(opt.key, e.target.checked)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {editingWebhook && (
                  <button
                    type="button"
                    className="button outline"
                    style={{ flex: 1, height: '36px' }}
                    onClick={() => {
                      setEditingWebhook(null)
                      setWebhookName('')
                      setWebhookUrl('')
                      setWebhookEvents([])
                    }}
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="button"
                  style={{ flex: 1, height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingWebhook ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          
          {/* Header toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
              Historique d'audit d'activité
            </h3>
            
            <button
              onClick={handleExportAuditLogs}
              disabled={logsPending}
              className="button outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '36px' }}
            >
              {logsPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exporter au format CSV
            </button>
          </div>

          {/* Filters Row */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
            
            {/* Filter User */}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Opérateur
              </label>
              <select
                className="form-control"
                style={{ height: '32px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                value={logsFilterUserId}
                onChange={e => {
                  setLogsFilterUserId(e.target.value)
                  setLogsPage(1)
                }}
              >
                <option value="">Tous les opérateurs</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Entity */}
            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Type d'Entité
              </label>
              <select
                className="form-control"
                style={{ height: '32px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                value={logsFilterEntityType}
                onChange={e => {
                  setLogsFilterEntityType(e.target.value)
                  setLogsPage(1)
                }}
              >
                <option value="">Toutes les entités</option>
                <option value="User">Utilisateurs</option>
                <option value="Contact">Contacts</option>
                <option value="Task">Tâches</option>
                <option value="Setting">Paramètres Système</option>
                <option value="SupportLevel">Niveaux de soutien</option>
                <option value="Tag">Tags</option>
                <option value="ApiKey">Clés API</option>
                <option value="Webhook">Webhooks</option>
              </select>
            </div>

            {/* Filter Action */}
            <div style={{ width: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                Action
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: LOGIN, UPDATE..."
                style={{ height: '32px', fontSize: '0.85rem' }}
                value={logsFilterAction}
                onChange={e => {
                  setLogsFilterAction(e.target.value.toUpperCase())
                  setLogsPage(1)
                }}
              />
            </div>
            
            {/* Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                onClick={() => fetchAuditLogs(logsPage)}
                className="button outline"
                style={{ height: '32px', width: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Actualiser la liste"
              >
                <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

          </div>

          {/* Audit Logs Table */}
          <div style={{ position: 'relative', overflowX: 'auto', minHeight: '200px' }}>
            {logsLoading && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                backgroundColor: 'rgba(255,255,255,0.7)', 
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                color: 'var(--primary)'
              }}>
                <Loader2 size={24} className="animate-spin" /> Chargement...
              </div>
            )}

            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: '160px' }}>Date</th>
                  <th style={{ width: '150px' }}>Action</th>
                  <th style={{ width: '130px' }}>Entité</th>
                  <th style={{ width: '180px' }}>Opérateur</th>
                  <th style={{ width: '120px' }}>Adresse IP</th>
                  <th>Changements / Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      Aucun log correspondant aux filtres.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const isSensitive = log.action.includes('PASSWORD') || log.action.includes('SECRET') || log.action.includes('2FA')

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '700', 
                            fontFamily: 'monospace',
                            backgroundColor: log.action.includes('DELETE') || log.action.includes('REVOKE') || log.action.includes('SUSPEND') ? '#fce8e6' : '#eff6ff',
                            color: log.action.includes('DELETE') || log.action.includes('REVOKE') || log.action.includes('SUSPEND') ? '#c5221f' : '#1e40af',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: '500' }}>{log.entityType}</span>
                          {log.entityId && (
                            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              ID: {log.entityId}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{log.userName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.userEmail}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {log.ip || '-'}
                        </td>
                        <td>
                          {isSensitive ? (
                            <div style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                              <AlertTriangle size={14} /> Données sensibles masquées
                            </div>
                          ) : log.details ? (
                            <pre style={{ 
                              margin: 0, 
                              fontSize: '0.75rem', 
                              backgroundColor: '#f8fafc', 
                              padding: '0.5rem', 
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              maxWidth: '450px',
                              maxHeight: '120px',
                              overflowY: 'auto'
                            }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Pas de détails</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {logsPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Affichage de la page <strong>{logsPage}</strong> sur <strong>{logsPages}</strong> (total : {logsTotal} logs)
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                  disabled={logsPage === 1 || logsLoading}
                  className="button outline"
                  style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setLogsPage(prev => Math.min(logsPages, prev + 1))}
                  disabled={logsPage === logsPages || logsLoading}
                  className="button outline"
                  style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Brevo Configuration */}
      {activeTab === 'brevo' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✉️ Configuration de la connexion Brevo
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Configurez vos identifiants d'envoi Brevo. Ces paramètres seront stockés de manière sécurisée en base de données et prendront le pas sur les variables d'environnement.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault()
              setErrorBanner('')
              setSuccessBanner('')
              setIsSavingBrevo(true)
              const res = await saveBrevoSettingsAction(brevoApiKey, brevoSenderEmail, brevoSenderName, brevoSignature)
              setIsSavingBrevo(false)
              if (res.success) {
                setSuccessBanner('Paramètres Brevo enregistrés avec succès.')
              } else {
                setErrorBanner(res.error || 'Erreur lors de l\'enregistrement')
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Clé API Brevo (v3)
                </label>
                <input
                  type="password"
                  value={brevoApiKey}
                  onChange={e => setBrevoApiKey(e.target.value)}
                  className="form-control"
                  placeholder="xkeysib-..."
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  E-mail de l'expéditeur
                </label>
                <input
                  type="email"
                  value={brevoSenderEmail}
                  onChange={e => setBrevoSenderEmail(e.target.value)}
                  className="form-control"
                  placeholder="contact@cabinet.fr"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Nom de l'expéditeur
                </label>
                <input
                  type="text"
                  value={brevoSenderName}
                  onChange={e => setBrevoSenderName(e.target.value)}
                  className="form-control"
                  placeholder="Lionel Tivoli"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Signature automatique des e-mails
                </label>
                <textarea
                  value={brevoSignature}
                  onChange={e => setBrevoSignature(e.target.value)}
                  className="form-control"
                  placeholder="Cordialement,&#10;L'équipe de Lionel Tivoli"
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingBrevo}
                className="button"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', height: '38px', marginTop: '0.5rem', cursor: isSavingBrevo ? 'not-allowed' : 'pointer' }}
              >
                {isSavingBrevo ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer la configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

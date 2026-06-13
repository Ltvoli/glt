'use client'

import { useEffect, useState } from 'react'
import { getPurgeStats, executePurge } from './actions'
import { Database, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function DataRetentionPage() {
  const [stats, setStats] = useState<{ contacts: number, mails: number, thresholdDate: Date } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurging, setIsPurging] = useState(false)
  const [result, setResult] = useState<{ deletedContacts: number, deletedMails: number } | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const data = await getPurgeStats()
      setStats({ ...data, thresholdDate: new Date(data.thresholdDate) })
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurge = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ces données ? Cette action est irréversible.')) {
      return
    }

    setIsPurging(true)
    try {
      const res = await executePurge()
      if (res.success) {
        setResult({
          deletedContacts: res.deletedContacts,
          deletedMails: res.deletedMails
        })
        await loadStats() // refresh stats (should be 0)
      }
    } catch (e) {
      alert("Erreur lors de la purge.")
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Database size={24} color="var(--primary)" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Politique de Conservation (RGPD)</h2>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} color="var(--text-muted)" />
          Données arrivées à expiration
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Conformément au RGPD, les données inactives depuis plus de 3 ans doivent être supprimées. 
          Le système identifie automatiquement :
          <br/>- Les <strong>contacts</strong> archivés depuis plus de 3 ans.
          <br/>- Les <strong>courriers</strong> classés dont la dernière modification remonte à plus de 3 ans.
        </p>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement des statistiques...</div>
        ) : stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: stats.contacts > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {stats.contacts}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Contacts à purger
              </div>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: stats.mails > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {stats.mails}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Courriers à purger
              </div>
            </div>
          </div>
        ) : null}

        {stats && (stats.contacts > 0 || stats.mails > 0) && (
          <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <AlertTriangle color="#ef4444" size={24} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1rem' }}>Purge Requise</h4>
                <p style={{ margin: '0 0 1rem 0', color: '#b91c1c', fontSize: '0.875rem' }}>
                  Ces données antérieures au <strong>{stats.thresholdDate.toLocaleDateString('fr-FR')}</strong> doivent être supprimées définitivement pour respecter la conformité RGPD.
                </p>
                <button 
                  onClick={handlePurge} 
                  disabled={isPurging}
                  className="button" 
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                >
                  {isPurging ? 'Purge en cours...' : 'Lancer la purge définitive'}
                </button>
              </div>
            </div>
          </div>
        )}

        {stats && stats.contacts === 0 && stats.mails === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <CheckCircle size={20} />
            <span style={{ fontWeight: 500 }}>Votre base de données est conforme. Aucune donnée n'est arrivée à expiration.</span>
          </div>
        )}
      </div>

      {result && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#166534', margin: '0 0 0.5rem 0' }}>
            Purge effectuée avec succès
          </h3>
          <p style={{ margin: 0, color: '#15803d' }}>
            <strong>{result.deletedContacts}</strong> contacts et <strong>{result.deletedMails}</strong> courriers ont été supprimés définitivement.
          </p>
        </div>
      )}
    </div>
  )
}

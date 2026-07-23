'use client'

import { ShieldCheck, X, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react'
import { performMailQualityCheck, QualityCheckItem } from '@/lib/mail-template-engine'

interface MailQualityCheckModalProps {
  mail: any
  contact?: any
  isOpen: boolean
  onClose: () => void
  onProceedToSubmission?: () => void
}

export default function MailQualityCheckModal({
  mail,
  contact,
  isOpen,
  onClose,
  onProceedToSubmission
}: MailQualityCheckModalProps) {
  if (!isOpen || !mail) return null

  const { isValid, items } = performMailQualityCheck(mail, contact)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 size={18} color="#16a34a" />
      case 'WARNING':
        return <AlertTriangle size={18} color="#f59e0b" />
      case 'ERROR':
        return <XCircle size={18} color="#dc2626" />
      default:
        return null
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 110,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '580px',
        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: isValid ? '#dcfce7' : '#fee2e2', borderRadius: '8px', color: isValid ? '#16a34a' : '#dc2626' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Contrôle Qualité du Courrier</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Vérification d'intégrité avant soumission
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', color: '#64748b' }}>
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            padding: '0.85rem 1rem', borderRadius: '8px',
            backgroundColor: isValid ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isValid ? '#bbf7d0' : '#fecca3'}`,
            fontSize: '0.875rem', color: isValid ? '#166534' : '#991b1b',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            {isValid ? (
              <>
                <CheckCircle2 size={20} color="#16a34a" />
                <span>Le courrier a réussi tous les contrôles qualité et est prêt pour la soumission.</span>
              </>
            ) : (
              <>
                <XCircle size={20} color="#dc2626" />
                <span>Certains critères bloquants doivent être corrigés avant la soumission.</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {items.map(item => (
              <div key={item.id} style={{
                padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: item.status === 'ERROR' ? '#fff5f5' : '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {getStatusIcon(item.status)}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: item.status === 'ERROR' ? '#dc2626' : '#64748b' }}>{item.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button onClick={onClose} className="button outline">
              Fermer & Corriger
            </button>
            {isValid && onProceedToSubmission && (
              <button
                onClick={() => {
                  onClose()
                  onProceedToSubmission()
                }}
                className="button primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Soumettre à validation <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

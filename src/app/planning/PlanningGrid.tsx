'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { updateEmployeeDayType, updatePlanningComment } from './actions'
import PlanningImportModal from './PlanningImportModal'
import PlanningUsersModal from './PlanningUsersModal'

type UserData = {
  id: string
  name: string
  email: string
  role: string
  showInPlanning: boolean
  counters: {
    workedMonth: number
    workedYear: number
    paidLeaveYear: number
    annualDays: number
    annualPaidLeaveDays?: number
    remainingWorked?: number
    remainingPaidLeave?: number
    remaining: number
  }
  monthCalendar: { dateStr: string; dayType: string; isHoliday: boolean; isWeekend: boolean; notes: string | null }[]
}

type CommentData = { dateStr: string; content: string }

export default function PlanningGrid({
  users,
  currentYear,
  currentMonth,
  isMagaliOrAdmin,
  initialComments = []
}: {
  users: UserData[]
  currentYear: number
  currentMonth: number
  isMagaliOrAdmin: boolean
  initialComments?: CommentData[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Selection
  const [selectedCell, setSelectedCell] = useState<{ userId: string; dateStr: string; dayType: string; notes: string } | null>(null)
  const [comments, setComments] = useState<CommentData[]>(initialComments)
  const [selectedCommentCell, setSelectedCommentCell] = useState<CommentData | null>(null)

  const handleCommentUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCommentCell) return

    startTransition(async () => {
      await updatePlanningComment(selectedCommentCell.dateStr, selectedCommentCell.content)
      setComments(prev => prev.map(c => c.dateStr === selectedCommentCell.dateStr ? { ...c, content: selectedCommentCell.content } : c))
      setSelectedCommentCell(null)
    })
  }

  const monthDate = new Date(Date.UTC(currentYear, currentMonth, 1))
  const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  
  // Nombres de jours dans le mois
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const navigateMonth = (offset: number) => {
    const d = new Date(Date.UTC(currentYear, currentMonth + offset, 1))
    router.push(`/planning?year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`)
  }

  const navigateToday = () => {
    const today = new Date()
    router.push(`/planning?year=${today.getUTCFullYear()}&month=${today.getUTCMonth()}`)
  }

  const handleCellClick = (user: UserData, dayData: UserData['monthCalendar'][0]) => {
    if (!isMagaliOrAdmin) return // Mode lecture seule
    setSelectedCell({
      userId: user.id,
      dateStr: dayData.dateStr,
      dayType: dayData.dayType,
      notes: dayData.notes || ''
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCell) return

    startTransition(async () => {
      await updateEmployeeDayType(selectedCell.userId, selectedCell.dateStr, selectedCell.dayType, selectedCell.notes)
      setSelectedCell(null)
    })
  }

  const getCellColor = (dayType: string, isWeekend: boolean, isHoliday: boolean) => {
    if (dayType === 'worked') return '#dcfce3' // Vert
    if (dayType === 'half_worked') return 'linear-gradient(135deg, #dcfce3 50%, #ffffff 50%)' // 1/2 Vert 1/2 Blanc
    if (dayType === 'paid_leave') return '#fee2e2' // Rouge
    if (dayType === 'half_paid_leave') return 'linear-gradient(135deg, #fee2e2 50%, #ffffff 50%)' // 1/2 Rouge 1/2 Blanc
    if (dayType === 'off') {
      if (isHoliday) return '#fef08a' // Jaune pour jour férié
      if (isWeekend) return '#e2e8f0' // Gris pour WE
      return '#ffffff' // Blanc pour off normal
    }
    return '#ffffff'
  }

  const visibleUsers = users.filter(u => u.showInPlanning)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Planning des Salariés</h1>
          <p style={{ color: 'var(--text-muted)' }}>Suivi des jours travaillés et congés.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isMagaliOrAdmin && <PlanningUsersModal users={users} />}
          {isMagaliOrAdmin && <PlanningImportModal />}
          <a href={`/api/export/planning?year=${currentYear}&month=${currentMonth}`} className="button outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Exporter Excel
          </a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="button outline" onClick={() => navigateMonth(-1)}><ArrowLeft size={16} /></button>
            <button className="button outline" onClick={navigateToday}>Ce mois-ci</button>
            <button className="button outline" onClick={() => navigateMonth(1)}><ArrowRight size={16} /></button>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textTransform: 'capitalize' }}>{monthName}</h2>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, backgroundColor: '#dcfce3', border: '1px solid #ccc' }}></div> Travaillé</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, background: 'linear-gradient(135deg, #dcfce3 50%, #ffffff 50%)', border: '1px solid #ccc' }}></div> 1/2 Travaillé</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, backgroundColor: '#fee2e2', border: '1px solid #ccc' }}></div> Congé</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, background: 'linear-gradient(135deg, #fee2e2 50%, #ffffff 50%)', border: '1px solid #ccc' }}></div> 1/2 Congé</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, backgroundColor: '#ffffff', border: '1px solid #ccc' }}></div> Non Travaillé</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, backgroundColor: '#fef08a', border: '1px solid #ccc' }}></div> Jour Férié</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: '0.875rem', minWidth: '1200px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '200px', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 10 }}>Collaborateur</th>
                <th style={{ textAlign: 'center', borderRight: '2px solid var(--border)' }}>Compteurs</th>
                {daysArray.map(day => {
                  const d = new Date(Date.UTC(currentYear, currentMonth, day))
                  const isWE = d.getUTCDay() === 0 || d.getUTCDay() === 6
                  return (
                    <th key={day} style={{ textAlign: 'center', width: '30px', padding: '0.5rem 0.25rem', backgroundColor: isWE ? '#f8fafc' : 'transparent' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.toLocaleDateString('fr-FR', { weekday: 'narrow', timeZone: 'UTC' })}</div>
                      <div>{day}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(user => {
                const c = user.counters
                const remainingCp = c.remainingPaidLeave !== undefined ? c.remainingPaidLeave : c.remaining
                const showCpAlert = remainingCp <= 3

                return (
                  <tr key={user.id}>
                    <td style={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 10, fontWeight: 500, borderRight: '1px solid var(--border)' }}>
                      {user.name}
                    </td>
                    <td style={{ borderRight: '2px solid var(--border)', padding: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Mois :</span>
                          <strong>{c.workedMonth}j travaillés</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Travail An :</span>
                          <strong>{c.workedYear}j / {c.annualDays}j</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Solde CP :</span>
                          <strong style={{ color: showCpAlert ? '#dc2626' : '#16a34a' }}>
                            {remainingCp}j restants ({c.paidLeaveYear}j pris)
                          </strong>
                        </div>
                      </div>
                    </td>
                    {user.monthCalendar.map((dayData, i) => (
                      <td 
                        key={i} 
                        style={{ 
                          padding: 0, 
                          border: '1px solid var(--border)',
                          background: getCellColor(dayData.dayType, dayData.isWeekend, dayData.isHoliday),
                          cursor: isMagaliOrAdmin ? 'pointer' : 'default'
                        }}
                        onClick={() => handleCellClick(user, dayData)}
                        title={dayData.isHoliday ? 'Jour Férié' : dayData.notes || ''}
                      >
                        <div style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {dayData.notes && <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--text-muted)', position: 'absolute', top: 2, right: 2 }}></span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}

              {/* LIGNE DE COMMENTAIRES GENERAUX */}
              <tr>
                <td style={{ position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 10, fontWeight: 'bold', borderRight: '1px solid var(--border)' }}>
                  Commentaires / Réunions AP
                </td>
                <td style={{ borderRight: '2px solid var(--border)', backgroundColor: '#f8fafc' }}></td>
                {comments.map((c, i) => {
                  const hasComment = c.content && c.content.trim() !== ''
                  const dayDate = new Date(c.dateStr)
                  const isWE = dayDate.getUTCDay() === 0 || dayDate.getUTCDay() === 6
                  return (
                    <td
                      key={i}
                      style={{
                        padding: 0,
                        border: '1px solid var(--border)',
                        backgroundColor: isWE ? '#f1f5f9' : '#f8fafc',
                        cursor: isMagaliOrAdmin ? 'pointer' : 'default',
                        position: 'relative'
                      }}
                      onClick={() => {
                        if (isMagaliOrAdmin) {
                          setSelectedCommentCell({ dateStr: c.dateStr, content: c.content })
                        }
                      }}
                      title={c.content || 'Ajouter un commentaire...'}
                    >
                      <div 
                        style={{ 
                          width: '100%', 
                          height: '40px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: 500,
                          padding: '2px',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {hasComment ? (
                          <span style={{ 
                            backgroundColor: '#eff6ff', 
                            color: '#1e40af', 
                            padding: '0.1rem 0.25rem', 
                            borderRadius: '4px', 
                            border: '1px solid #bfdbfe',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {c.content}
                          </span>
                        ) : (
                          isMagaliOrAdmin && <span style={{ color: '#ccc', fontSize: '0.85rem' }}>+</span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDITION CELLULE */}
      {selectedCell && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Modifier le statut <br/>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                {new Date(selectedCell.dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </span>
            </h3>
            
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Statut</label>
                <select 
                  className="form-control" 
                  value={selectedCell.dayType} 
                  onChange={e => setSelectedCell({ ...selectedCell, dayType: e.target.value })}
                >
                  <option value="worked">Travaillé (Vert)</option>
                  <option value="half_worked">1/2 Journée Travaillée (1/2 Vert)</option>
                  <option value="off">Non travaillé (Blanc)</option>
                  <option value="paid_leave">Congé Payé (Rouge)</option>
                  <option value="half_paid_leave">1/2 Journée Congé Payé (1/2 Rouge)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Note optionnelle</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: RTT, Récupération, Matin uniquement..."
                  value={selectedCell.notes}
                  onChange={e => setSelectedCell({ ...selectedCell, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="button outline" onClick={() => setSelectedCell(null)} disabled={isPending}>Annuler</button>
                <button type="submit" className="button primary" disabled={isPending}>{isPending ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITION COMMENTAIRE */}
      {selectedCommentCell && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Commentaire / Réunion AP <br/>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                {new Date(selectedCommentCell.dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </span>
            </h3>
            
            <form onSubmit={handleCommentUpdate}>
              <div className="form-group">
                <label>Commentaire</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  placeholder="Saisir un commentaire (ex: Réunion AP, Déplacement...)"
                  value={selectedCommentCell.content}
                  onChange={e => setSelectedCommentCell({ ...selectedCommentCell, content: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="button outline" onClick={() => setSelectedCommentCell(null)} disabled={isPending}>Annuler</button>
                <button type="submit" className="button primary" disabled={isPending}>{isPending ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'

export default function WeekNavigator({ currentDate, prevDate, nextDate }: { currentDate: string, prevDate: string, nextDate: string }) {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="hide-on-print">
      <button 
        onClick={() => router.push(`/reports/weekly?date=${prevDate}`)}
        className="button outline" 
        style={{ padding: '0.4rem 0.75rem' }}
        title="Semaine précédente"
      >
        ◀
      </button>
      
      <input 
        type="date" 
        className="form-control" 
        style={{ width: 'auto', padding: '0.4rem' }}
        value={currentDate}
        onChange={(e) => {
          if (e.target.value) {
            router.push(`/reports/weekly?date=${e.target.value}`)
          }
        }}
        title="Sélectionner une date dans la semaine désirée"
      />

      <button 
        onClick={() => router.push(`/reports/weekly?date=${nextDate}`)}
        className="button outline" 
        style={{ padding: '0.4rem 0.75rem' }}
        title="Semaine suivante"
      >
        ▶
      </button>
    </div>
  )
}

'use client'

import React, { useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CalendarClient() {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)

  const handleEventDrop = async (info: any) => {
    try {
      const response = await fetch('/api/calendar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: info.event.id,
          start: info.event.start.toISOString()
        })
      })
      if (!response.ok) throw new Error('Update failed')
      toast.success('Date mise à jour')
    } catch (e) {
      toast.error('Erreur lors de la mise à jour')
      info.revert()
    }
  }

  const handleEventClick = (info: any) => {
    const { type, rawId } = info.event.extendedProps
    if (type === 'task') router.push(`/tasks/${rawId}`)
    else if (type === 'mail') router.push(`/mails/${rawId}`)
    else if (type === 'permanence') router.push(`/permanences/${rawId}`)
  }

  return (
    <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px' }}>
      <style>{`
        .fc-event { cursor: pointer; }
        .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 600; color: #0f172a; text-transform: capitalize; }
        .fc-button-primary { background-color: #f1f5f9 !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; }
        .fc-button-primary:not(:disabled):active, .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #e2e8f0 !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="fr"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events="/api/calendar/events"
        editable={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        height="auto"
      />
    </div>
  )
}

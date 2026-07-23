import { isWeekend, isHoliday } from './holidays';

export interface DayStatus {
  date: Date;
  dayType: string; // 'worked', 'half_worked', 'off', 'paid_leave', 'half_paid_leave'
}

/**
 * Compare deux dates au format UTC YYYY-MM-DD
 */
export function isSameDayUtc(d1: Date | string, d2: Date | string): boolean {
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  )
}

/**
 * Détermine le type de jour par défaut si non spécifié dans la base.
 */
export function getDefaultDayType(date: Date): string {
  if (isWeekend(date) || isHoliday(date)) {
    return 'off';
  }
  return 'worked';
}

/**
 * Construit un calendrier mensuel avec les statuts fusionnés (Bdd + Défaut)
 */
export function getMonthlyCalendar(year: number, month: number, statuses: DayStatus[]): DayStatus[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const calendar: DayStatus[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month, d));
    const dbStatus = statuses.find(s => isSameDayUtc(s.date, date));
    calendar.push({
      date,
      dayType: dbStatus ? dbStatus.dayType : getDefaultDayType(date)
    });
  }

  return calendar;
}

/**
 * Calcule les compteurs pour un utilisateur donné sur une plage donnée.
 * Prrend en compte les saisies BDD, et attribue 'worked' par défaut aux jours ouvrés passés non spécifiés.
 */
export function calculateCounters(
  startDate: Date, 
  endDate: Date, 
  statuses: DayStatus[]
) {
  let worked = 0;
  let paidLeave = 0;
  let off = 0;

  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  const current = new Date(startDate)
  while (current <= endDate) {
    const dbStatus = statuses.find(s => isSameDayUtc(s.date, current))
    let dayType: string

    if (dbStatus) {
      dayType = dbStatus.dayType
    } else {
      const isWE = isWeekend(current)
      const isHol = isHoliday(current)
      if (isWE || isHol) {
        dayType = 'off'
      } else if (current <= today) {
        dayType = 'worked'
      } else {
        dayType = 'off'
      }
    }

    if (dayType === 'worked') worked++
    else if (dayType === 'half_worked') {
      worked += 0.5
      off += 0.5
    }
    else if (dayType === 'paid_leave') paidLeave++
    else if (dayType === 'half_paid_leave') {
      paidLeave += 0.5
      off += 0.5
    }
    else off++

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return { worked, paidLeave, off }
}

/**
 * Retourne le début de l'année de référence (ex: 1er Juin) pour une date donnée
 */
export function getReferencePeriodStart(currentDate: Date, startMonth: number, startDay: number): Date {
  const year = currentDate.getUTCFullYear();
  const periodMonth = startMonth - 1; // startMonth est 1-indexed (1=Janvier, 6=Juin)
  
  let refStart = new Date(Date.UTC(year, periodMonth, startDay));
  
  // Si la date actuelle est avant le début de période (ex: Février 2026 pour une période qui commence en Juin)
  // alors le début de période est le 1er Juin de l'année N-1.
  if (currentDate.getTime() < refStart.getTime()) {
    refStart = new Date(Date.UTC(year - 1, periodMonth, startDay));
  }
  
  return refStart;
}

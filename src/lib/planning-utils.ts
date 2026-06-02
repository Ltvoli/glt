import { isWeekend, isHoliday } from './holidays';

export interface DayStatus {
  date: Date;
  dayType: string; // 'worked', 'off', 'paid_leave'
}

/**
 * Détermine le type de jour par défaut si non spécifié dans la base.
 */
export function getDefaultDayType(date: Date): string {
  if (isWeekend(date) || isHoliday(date)) {
    return 'off';
  }
  return 'worked'; // Semaine = travaillé par défaut
}

/**
 * Construit un calendrier mensuel avec les statuts fusionnés (Bdd + Défaut)
 */
export function getMonthlyCalendar(year: number, month: number, statuses: DayStatus[]): DayStatus[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const calendar: DayStatus[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month, d));
    const dbStatus = statuses.find(s => s.date.getTime() === date.getTime());
    calendar.push({
      date,
      dayType: dbStatus ? dbStatus.dayType : getDefaultDayType(date)
    });
  }

  return calendar;
}

/**
 * Calcule les compteurs pour un utilisateur donné sur une plage donnée.
 * Note: on s'arrête à aujourd'hui si on calcule le réel accompli, ou on prend tout le mois/l'année.
 * Le CDC demande: "jours travaillés depuis le 1er juin", etc.
 * Cela implique de calculer pour tous les jours de l'année de référence (passés et futurs prévus).
 */
export function calculateCounters(
  startDate: Date, 
  endDate: Date, 
  statuses: DayStatus[]
) {
  let worked = 0;
  let paidLeave = 0;
  let off = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const time = current.getTime();
    const dbStatus = statuses.find(s => s.date.getTime() === time);
    const dayType = dbStatus ? dbStatus.dayType : getDefaultDayType(current);

    if (dayType === 'worked') worked++;
    else if (dayType === 'paid_leave') paidLeave++;
    else off++;

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { worked, paidLeave, off };
}

/**
 * Retourne le début de l'année de référence (ex: 1er Juin) pour une date donnée
 */
export function getReferencePeriodStart(currentDate: Date, startMonth: number, startDay: number): Date {
  const year = currentDate.getUTCFullYear();
  // startMonth est 1-indexed (1=Janvier, 6=Juin) -> on le passe en 0-indexed
  const periodMonth = startMonth - 1;
  
  let refStart = new Date(Date.UTC(year, periodMonth, startDay));
  
  // Si la date actuelle est avant le début de période (ex: Février 2026 pour une période qui commence en Juin)
  // alors on est sur l'année N-1.
  if (currentDate.getTime() < refStart.getTime()) {
    refStart = new Date(Date.UTC(year - 1, periodMonth, startDay));
  }
  
  return refStart;
}

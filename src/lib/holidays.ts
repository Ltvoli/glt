// Calcul de Pâques (Algorithme de Butcher-Meeus)
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = Math.floor((h + l - 7 * m + 114) / 31);
  const p = (h + l - 7 * m + 114) % 31;
  return new Date(Date.UTC(year, n - 1, p + 1));
}

export function getFrenchHolidays(year: number): Date[] {
  const easter = getEaster(year);
  
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easter.getUTCDate() + 1);

  const ascension = new Date(easter);
  ascension.setUTCDate(easter.getUTCDate() + 39);

  const pentecostMonday = new Date(easter);
  pentecostMonday.setUTCDate(easter.getUTCDate() + 50);

  return [
    new Date(Date.UTC(year, 0, 1)),     // Jour de l'an
    easterMonday,                       // Lundi de Pâques
    new Date(Date.UTC(year, 4, 1)),     // Fête du Travail
    new Date(Date.UTC(year, 4, 8)),     // Victoire 1945
    ascension,                          // Ascension
    pentecostMonday,                    // Lundi de Pentecôte
    new Date(Date.UTC(year, 6, 14)),    // Fête Nationale
    new Date(Date.UTC(year, 7, 15)),    // Assomption
    new Date(Date.UTC(year, 10, 1)),    // Toussaint
    new Date(Date.UTC(year, 10, 11)),   // Armistice
    new Date(Date.UTC(year, 11, 25))    // Noël
  ];
}

export function isHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const holidays = getFrenchHolidays(year);
  const time = date.getTime();
  return holidays.some(h => h.getTime() === time);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Dimanche = 0, Samedi = 6
}

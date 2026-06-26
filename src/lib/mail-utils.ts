export function addBusinessDays(startDate: Date, days: number): Date {
  const resultDate = new Date(startDate)
  let addedDays = 0
  while (addedDays < days) {
    resultDate.setDate(resultDate.getDate() + 1)
    const day = resultDate.getDay()
    if (day !== 0 && day !== 6) { // Skip Sunday(0) and Saturday(6)
      addedDays++
    }
  }
  return resultDate
}

export function isWorkflowTaskTitle(title: string, mailRef?: string): boolean {
  if (mailRef) {
    return title === `[URGENT] Traiter le courrier : ${mailRef}` ||
           title === `Préparer courrier d'intervention : ${mailRef}` ||
           title === `Rédiger projet de réponse : ${mailRef}`
  }
  return title.startsWith("[URGENT] Traiter le courrier :") ||
         title.startsWith("Préparer courrier d'intervention :") ||
         title.startsWith("Rédiger projet de réponse :")
}

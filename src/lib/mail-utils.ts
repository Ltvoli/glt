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

export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: 'Inconnu', lastName: 'INCONNU' }
  }

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const name = parts[0]
    return {
      firstName: '-',
      lastName: name.toUpperCase()
    }
  }

  const isUppercaseWord = (word: string) => {
    const hasLetter = /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(word)
    const hasLowercase = /[a-zà-öø-ÿ]/.test(word)
    return hasLetter && !hasLowercase
  }

  const uppercaseIndices = parts.map((w, i) => isUppercaseWord(w) ? i : -1).filter(idx => idx !== -1)

  if (uppercaseIndices.length > 0) {
    const firstUpperIdx = uppercaseIndices[0]
    if (firstUpperIdx > 0) {
      const firstNameParts = parts.slice(0, firstUpperIdx)
      const lastNameParts = parts.slice(firstUpperIdx)
      return {
        firstName: firstNameParts.join(' '),
        lastName: lastNameParts.join(' ').toUpperCase()
      }
    } else {
      const firstMixedIdx = parts.findIndex(w => !isUppercaseWord(w))
      if (firstMixedIdx !== -1) {
        const lastNameParts = parts.slice(0, firstMixedIdx)
        const firstNameParts = parts.slice(firstMixedIdx)
        return {
          firstName: firstNameParts.join(' '),
          lastName: lastNameParts.join(' ').toUpperCase()
        }
      }
    }
  }

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return {
    firstName: firstName,
    lastName: lastName.toUpperCase()
  }
}


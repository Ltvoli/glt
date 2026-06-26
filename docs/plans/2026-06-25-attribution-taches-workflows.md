# Plan d'implémentation - Attribution Automatique de Tâches (Workflows)

Ce document décrit le plan d'implémentation détaillé pour introduire les workflows de tâches automatiques lors de la création ou mise à jour de courriers.

---

## Proposed Changes

### [Mails Module]

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
* Ajouter la fonction utilitaire `isWorkflowTaskTitle` pour repérer si le titre d'une tâche correspond à un format automatique :
  ```typescript
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
  ```
* Extraire la logique de calcul de jours ouvrés existante dans une fonction exportée `addBusinessDays` :
  ```typescript
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
  ```
* Remplacer le calcul en ligne dans `createMail` et `updateMail` par l'appel à `addBusinessDays`.
* Modifier la logique de synchronisation de la tâche manuelle dans `updateMail` pour qu'elle ne supprime pas les liens globaux des tâches de workflow :
  ```typescript
  const existingLinks = await prisma.globalLink.findMany({
    where: { mailCaseId: mailId, taskId: { not: null } },
    include: { task: true }
  })
  
  const manualLinks = existingLinks.filter(l => l.task && !isWorkflowTaskTitle(l.task.title, existing.reference))
  
  if (manualLinks.length > 0) {
    await prisma.globalLink.deleteMany({
      where: {
        id: { in: manualLinks.map(l => l.id) }
      }
    })
  }
  
  if (taskId) {
    const alreadyLinked = existingLinks.some(l => l.taskId === taskId)
    if (!alreadyLinked) {
      await prisma.globalLink.create({
        data: { mailCaseId: mailId, taskId }
      })
    }
  }
  ```
* Ajouter et exporter la fonction `triggerMailCaseWorkflows(mailCaseId: string, currentUserId: string | null)` :
  * Récupérer le courrier avec ses liaisons de tâches existantes.
  * Pour chaque critère (Urgence Haute ➔ J+2 ouvrés, Demande d'intervention ➔ J+5 ouvrés, Réclamation ➔ J+5 ouvrés) :
    * Vérifier l'absence de doublon.
    * Créer la tâche avec la priorité adéquate.
    * Associer via `GlobalLink`.
    * Créer une notification si un collaborateur tiers est assigné.
* Appeler `triggerMailCaseWorkflows` aux endroits stratégiques :
  * Dans `createMail` juste avant la fin du bloc try.
  * Dans `updateMail` juste avant la fin du bloc try.
  * Dans `applyMailMetadataAction` après le `update` réussi de Prisma.

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/mails/[id]/edit/page.tsx)
* Importer `isWorkflowTaskTitle` depuis `../actions`.
* Modifier la récupération de `linkedTask` pour exclure les tâches générées automatiquement, garantissant que seule la tâche manuelle soit proposée/modifiée dans le formulaire d'édition :
  ```typescript
  const allLinkedTasks = await prisma.globalLink.findMany({
    where: { mailCaseId: mail.id, taskId: { not: null } },
    include: { task: { select: { title: true } } }
  })
  const manualLinkedTask = allLinkedTasks.find(link => link.task && !isWorkflowTaskTitle(link.task.title, mail.reference))
  const initialTaskId = manualLinkedTask?.taskId || undefined
  ```

---

## Verification Plan

### Automated Tests
* Lancer la vérification TypeScript :
  ```powershell
  npx tsc --noEmit
  ```
* Lancer la validation du format (Linter) :
  ```powershell
  npm run lint
  ```

### Manual Verification
1. Créer un courrier entrant avec urgence "Haute". Vérifier qu'une tâche `[URGENT] Traiter le courrier : COU-xxxx` est créée à l'échéance de J+2 ouvrés.
2. Éditer le courrier pour changer sa catégorie en "Demande d'intervention". Vérifier qu'une tâche `Préparer courrier d'intervention : COU-xxxx` est créée à J+5 ouvrés, et que la tâche d'urgence n'a pas été supprimée.
3. Vérifier que les deux tâches s'affichent correctement sous l'onglet "Tâches liées" sur la fiche détaillée du courrier.
4. Éditer à nouveau le courrier pour lier manuellement une autre tâche standard de test. Vérifier que la tâche standard est bien liée en plus des tâches automatiques.

# Plan d'implémentation : Communication & Collaboration (Tâches & Courriers)

**Objectif** : Implémenter les mentions `@collaborateur`, l'identification de l'auteur des commentaires sur les tâches, l'historique d'activité sur les sous-tâches, et le bouton de relance.
**Architecture** : Mise à jour du modèle `TaskComment` dans le schéma Prisma, enrichissement des actions serveurs pour insérer et analyser les données d'audit/mentions, et composants UI adaptés.
**Stack Tech** : Prisma (PostgreSQL), Next.js Server Actions, React client components, Sonner.

---

## Composants à Modifier / Créer

### 1. Base de données : `prisma/schema.prisma`
Ajouter les champs `authorId` et la relation `author` dans le modèle `TaskComment`.

### 2. Actions de Tâches : `src/app/tasks/[id]/actions.ts`
- Mettre à jour `addTaskComment` pour renseigner `authorId`, faire la recherche des mentions `@` et envoyer des notifications de mention.
- Mettre à jour `addSubtask`, `toggleSubtask`, et `deleteSubtask` pour inclure `logAudit`.
- Ajouter `nudgeAssigneeAction(taskId: string)`.

### 3. Actions de Courriers : `src/app/mails/actions.ts`
- Mettre à jour `addMailComment` pour effectuer l'analyse des mentions `@` et envoyer des notifications de mention.

### 4. Page de Détail de Tâche : `src/app/tasks/[id]/page.tsx`
- Rendre les commentaires de tâches avec l'auteur associé (`author: { firstName, lastName }`).
- Gérer l'affichage des nouveaux logs d'audit (sous-tâches, relance).
- Intégrer le bouton `NudgeButton` dans l'en-tête.

### 5. Composants Client Tâches :
- `src/app/tasks/[id]/task-comments.tsx` : Mettre à jour le rendu pour afficher le nom de l'auteur à côté de chaque commentaire.
- `src/app/tasks/[id]/nudge-button.tsx` : Créer ce composant client pour gérer le clic sur la relance avec `useTransition` et notifications d'état.

---

## Étapes détaillées

### Étape 1 : Modification et migration du Schéma
- Fichier : [schema.prisma](file:///d:/Téléchargements/CDC/prisma/schema.prisma)
- Modifier `TaskComment` :
```prisma
model TaskComment {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  content   String
  createdAt DateTime @default(now())

  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
}
```
- Commande de synchronisation : `npx prisma db push`

### Étape 2 : Helper de détection de mentions
- Créer une fonction réutilisable pour analyser les mentions dans un commentaire et notifier les utilisateurs concernés.
- Nous l'ajouterons comme fonction interne dans une action ou un utilitaire commun.
```typescript
async function handleCommentMentions(content: string, authorId: string, relatedId: string, relatedType: 'Task' | 'MailCase', titleText: string) {
  const matches = content.match(/@([a-zA-ZÀ-ÖØ-öø-ÿ0-9\._\-]+)/g)
  if (!matches) return

  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true }
  })
  const authorName = author ? `${author.firstName} ${author.lastName}` : 'Un collaborateur'

  // Nettoyer les doublons de mentions
  const uniqueNames = Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())))

  for (const name of uniqueNames) {
    // Rechercher l'utilisateur par prénom, nom ou e-mail
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { equals: name, mode: 'insensitive' } },
          { lastName: { equals: name, mode: 'insensitive' } },
          { email: { equals: name, mode: 'insensitive' } }
        ],
        isActive: true
      }
    })

    for (const u of users) {
      if (u.id === authorId) continue // Ne pas s'auto-notifier

      await prisma.notification.create({
        data: {
          userId: u.id,
          type: 'COMMENT_ADDED',
          title: 'Vous avez été mentionné',
          message: `${authorName} vous a mentionné dans un commentaire sur : "${titleText}"`,
          relatedType,
          relatedId,
          severity: 'INFO'
        }
      })
    }
  }
}
```

### Étape 3 : Actions serveurs des Tâches
- Fichier : [src/app/tasks/[id]/actions.ts](file:///d:/Téléchargements/CDC/src/app/tasks/[id]/actions.ts)
- Modifier `addTaskComment` :
```typescript
export async function addTaskComment(taskId: string, content: string) {
  const session = await requireWriteAccess()
  requirePermission(session.role, 'MANAGE_TASKS')

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return { error: 'Tâche introuvable' }

  const comment = await prisma.taskComment.create({
    data: {
      content: content.trim(),
      taskId,
      authorId: session.userId
    }
  })

  // Envoyer notifications mentions
  await handleCommentMentions(content, session.userId, taskId, 'Task', task.title)

  // Notification à l'assigné de la tâche
  if (task.assigneeId && task.assigneeId !== session.userId) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'COMMENT_ADDED',
        title: 'Nouveau commentaire',
        message: `Un commentaire a été ajouté sur la tâche "${task.title}".`,
        relatedType: 'Task',
        relatedId: task.id,
        severity: 'INFO'
      }
    })
  }

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}
```
- Modifier `addSubtask`, `toggleSubtask` et `deleteSubtask` pour inclure les logs d'audit.
- Ajouter `nudgeAssigneeAction` :
```typescript
export async function nudgeAssigneeAction(taskId: string) {
  const session = await requireWriteAccess()
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true }
  })
  if (!task) return { error: 'Tâche introuvable' }
  if (!task.assigneeId) return { error: 'Aucun responsable assigné à cette tâche' }

  await prisma.notification.create({
    data: {
      userId: task.assigneeId,
      type: 'ASSIGNED',
      title: 'Rappel de tâche',
      message: `Relance de ${session.role} : Pouvez-vous faire un point sur la tâche "${task.title}" ?`,
      relatedType: 'Task',
      relatedId: task.id,
      severity: 'WARNING'
    }
  })

  await logAudit('NUDGE', 'Task', taskId, session.userId, { assigneeId: task.assigneeId })

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}
```

### Étape 4 : Action serveur des Courriers (Mentions)
- Fichier : [src/app/mails/actions.ts](file:///d:/Téléchargements/CDC/src/app/mails/actions.ts)
- Dans `addMailComment` :
  Appeler `handleCommentMentions(content, session.userId, mailId, 'MailCase', comment.mailCase.subject)` après création du commentaire.

### Étape 5 : Page de Détail de Tâche et Historique
- Fichier : [src/app/tasks/[id]/page.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/[id]/page.tsx)
- Mettre à jour `getAuditText(log)` pour gérer `ADD_SUBTASK`, `TOGGLE_SUBTASK`, `DELETE_SUBTASK`, et `NUDGE`.
- Récupérer l'auteur dans `comments` :
```typescript
        comments: { 
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { firstName: true, lastName: true } } }
        },
```
- Intégrer `<NudgeButton taskId={task.id} assigneeName={task.assignee?.firstName || ''} />` à côté du statut/titre de la tâche.

### Étape 6 : Composants UI
- `src/app/tasks/[id]/task-comments.tsx` : Afficher le nom complet de l'auteur si disponible.
- `src/app/tasks/[id]/nudge-button.tsx` : Composant client avec gestion d'état de relance.

---

## Plan de vérification
- Compilation : `npx tsc --noEmit`
- Linter : `npm run lint`
- Tests manuels sur l'envoi de commentaires, le flux d'activité étendu, et le bouton de relance.

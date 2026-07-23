# Plan d'implémentation : Liaison des Tâches aux Courriers (Mails) et Questions Écrites (QE)

**Objectif** : Permettre de lier des tâches aux Courriers et QE depuis le formulaire de création/édition globale et ajouter des raccourcis de création depuis les fiches de Courriers et QE.
**Architecture** : Mise à jour des Server Actions de création/édition de tâches pour insérer/mettre à jour les liaisons `GlobalLink`, et modification des composants serveurs/clients pour afficher les champs de sélection et boutons d'action.
**Stack Tech** : Next.js 16 (App Router), Prisma, PostgreSQL.

---

## Liste des tâches

### 1. Logique Serveur (Server Actions)

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/tasks/actions.ts)
- Dans la fonction `createTask` :
  - Extraire `mailCaseId` et `questionId` depuis le formulaire.
  - Insérer les liaisons `GlobalLink` correspondantes.

```typescript
  const mailCaseId = formData.get('mailCaseId') as string
  const questionId = formData.get('questionId') as string
  
  // ... après la création de la tâche ...
  if (mailCaseId) {
    await prisma.globalLink.create({
      data: { taskId: task.id, mailCaseId }
    })
  }
  if (questionId) {
    await prisma.globalLink.create({
      data: { taskId: task.id, questionId }
    })
  }
```

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/tasks/%5Bid%5D/actions.ts)
- Dans la fonction `updateTask` :
  - Extraire `mailCaseId` et `questionId` depuis le formulaire.
  - Mettre à jour (remplacer/créer/supprimer) les liaisons `GlobalLink` correspondantes pour la tâche.

```typescript
  const mailCaseId = formData.get('mailCaseId') as string
  const questionId = formData.get('questionId') as string

  // ... dans la transaction de mise à jour ...
  await prisma.globalLink.deleteMany({
    where: {
      taskId: id,
      OR: [
        { mailCaseId: { not: null } },
        { questionId: { not: null } }
      ]
    }
  })

  if (mailCaseId) {
    await prisma.globalLink.create({
      data: { taskId: id, mailCaseId }
    })
  }
  if (questionId) {
    await prisma.globalLink.create({
      data: { taskId: id, questionId }
    })
  }
```

---

### 2. Interface Utilisateur (Formulaire de Création)

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/new/page.tsx)
- Récupérer les paramètres `mailCaseId` et `questionId` depuis `searchParams`.
- Charger les Courriers et QE récents actifs :
```typescript
  const activeMails = await prisma.mailCase.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  const activeQes = await prisma.writtenQuestion.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
```
- Passer les paramètres et les collections de données à `<TaskForm>`.

#### [MODIFY] [task-form.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/new/task-form.tsx)
- Accepter les nouvelles props : `mailCaseId`, `questionId`, `mails = []`, `qes = []`.
- Si `mailCaseId` ou `questionId` sont pré-remplis par URL, les stocker dans des inputs `<input type="hidden">`.
- Sinon, afficher des listes déroulantes de sélection dans une nouvelle section **Dossiers associés**.

---

### 3. Interface Utilisateur (Formulaire d'Édition)

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/%5Bid%5D/page.tsx)
- Inclure les liaisons `links: true` dans la requête Prisma de récupération de la tâche.
- Charger les Courriers et QE actifs :
```typescript
  const activeMails = await prisma.mailCase.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  const activeQes = await prisma.writtenQuestion.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
```
- Passer les collections à `<EditTaskForm>`.

#### [MODIFY] [edit-task-form.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/%5Bid%5D/edit-task-form.tsx)
- Accepter les props `mails` et `qes`.
- Détecter le Courrier lié (`linkedMailId`) et la QE liée (`linkedQeId`) depuis `task.links`.
- Afficher les listes de sélection pour modifier ces liaisons.

---

### 4. Boutons d'Action Rapide sur les Fiches

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/mails/%5Bid%5D/page.tsx)
- Ajouter le bouton « Créer » dans l'en-tête de la carte « Tâches liées » menant vers `/tasks/new?mailCaseId=${mail.id}`.

---

## Plan de vérification

- Exécuter la compilation locale : `npx tsc --noEmit`
- Déployer sur le VPS Hostinger : `ssh -o StrictHostKeyChecking=no root@77.37.51.250 "bash /var/www/cdc/scripts/vps-deploy.sh"`
- Tester la création de tâche depuis un Courrier, une QE, et depuis la console globale de création de tâches.

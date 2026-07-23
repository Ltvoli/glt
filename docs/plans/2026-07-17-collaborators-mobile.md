# Plan d'implémentation : Ajout du Téléphone Mobile pour les Collaborateurs

**Objectif** : Ajouter le champ "Téléphone mobile" dans le modèle User (base de données), l'exposer dans les réglages du profil utilisateur, et l'utiliser pour l'envoi des relances SMS de tâches.
**Architecture** : Migration du modèle Prisma `User`, mise à jour des Server Actions et du formulaire client de gestion de profil, et intégration de l'envoi de SMS Brevo dans le cron de notification.
**Stack Tech** : Prisma (db push), Next.js 16 (App Router), Brevo API.

---

## Liste des tâches

### 1. Base de Données

#### [MODIFY] [schema.prisma](file:///d:/Téléchargements/CDC/prisma/schema.prisma)
- Ajouter `mobilePhone String?` dans le modèle `User` :
```prisma
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  firstName    String
  lastName     String
  mobilePhone  String? // Numéro de mobile pour alertes SMS
  passwordHash String
  ...
```

---

### 2. Actions & API Profil Utilisateur

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/settings/actions.ts)
- Modifier `updateProfileAction` pour accepter `mobilePhone: string` :
```typescript
export async function updateProfileAction(
  firstName: string,
  lastName: string,
  email: string,
  mobilePhone?: string
): Promise<ActionResult> {
  // ...
  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      mobilePhone: mobilePhone ? mobilePhone.trim() : null
    }
  })
  // ...
}
```

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/settings/profile/page.tsx)
- Ajouter `mobilePhone: true` dans la requête `prisma.user.findUnique`.

#### [MODIFY] [profile-client.tsx](file:///d:/Téléchargements/CDC/src/app/settings/profile/profile-client.tsx)
- Gérer l'état local du numéro de téléphone (`mobilePhone`).
- Ajouter le champ de saisie HTML "Téléphone mobile" dans le formulaire.
- Transmettre ce champ à l'action `updateProfileAction`.

---

### 3. SMS automatique (Cron Job)

#### [MODIFY] [route.ts](file:///d:/Téléchargements/CDC/src/app/api/cron/notifications/route.ts)
- Dans `dueTomorrowTasks`, si le responsable a un numéro `mobilePhone`, appeler `sendBrevoSms` :
```typescript
        if (task.assignee?.mobilePhone) {
          const { sendBrevoSms } = await import('@/lib/brevo')
          const smsText = `Rappel : Votre tache "${task.title}" arrive a echeance demain.`
          try {
            await sendBrevoSms(task.assignee.mobilePhone, smsText)
          } catch (smsErr) {
            console.error(`[CRON] Echec de l'envoi de SMS pour la tache ${task.id} :`, smsErr)
          }
        }
```

---

## Plan de vérification

- Exécuter la compilation locale : `npx tsc --noEmit`
- Pousser sur GitHub et déployer sur le VPS Hostinger (qui applique `prisma db push` automatiquement).
- Tester la saisie du numéro sur son profil et la réception simulée/réelle de SMS.

# Plan d'implémentation : Suivi visuel des courriers en retard

**Objectif** : Ajouter un indicateur de retard dynamique et proactif dans la barre latérale (Sidebar) et sur le tableau de la liste des courriers pour les dossiers dont la date d'échéance cible est dépassée.
**Architecture** : Calcul serveur du nombre de dossiers en retard dans layout.tsx via Prisma, transmission en prop à Sidebar, et rendu visuel du badge. Modification de mail-table-client.tsx pour ajouter une étiquette "En retard".
**Stack Tech** : Next.js (App Router), React, Prisma, Tailwind CSS / Vanilla CSS.

---

## Proposed Changes

### [Core Layout]

#### [MODIFY] [layout.tsx](file:///d:/Téléchargements/CDC/src/app/layout.tsx)
* Modifier l'appel `Promise.all` pour ajouter le calcul de `lateMailCount` via Prisma :
  ```typescript
  prisma.mailCase.count({
    where: {
      responseDueDate: { lt: new Date() },
      status: { notIn: ['REPONDU', 'CLASSE'] }
    }
  })
  ```
* Récupérer le résultat et le passer en prop au composant `<Sidebar />` sous le nom `lateMailCount`.

---

### [Navigation & Sidebar]

#### [MODIFY] [Sidebar.tsx](file:///d:/Téléchargements/CDC/src/components/Sidebar.tsx)
* Ajouter `lateMailCount` aux propriétés destructurées du composant `Sidebar` avec une valeur par défaut de `0` :
  ```typescript
  export default function Sidebar({ 
    userRole, 
    activeModules = [], 
    unreadCount = 0, 
    lateMailCount = 0 
  }: { 
    userRole?: string, 
    activeModules?: string[], 
    unreadCount?: number, 
    lateMailCount?: number 
  })
  ```
* Modifier le rendu de la boucle des éléments de navigation :
  * Ajouter un `span` autour de l'intitulé de l'onglet : `<span style={{ flex: 1 }}>{item.name}</span>`
  * Si `item.href === '/mails' && lateMailCount > 0`, rendre un badge de notification rouge à droite :
    ```tsx
    {item.href === '/mails' && lateMailCount > 0 && (
      <span style={{
        backgroundColor: 'var(--danger)',
        color: 'white',
        fontSize: '0.7rem',
        fontWeight: '700',
        borderRadius: '9999px',
        padding: '0.15rem 0.45rem',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '1.25rem',
        height: '1.25rem',
        marginLeft: 'auto'
      }}>
        {lateMailCount}
      </span>
    )}
    ```

---

### [Mails Module]

#### [MODIFY] [mail-table-client.tsx](file:///d:/Téléchargements/CDC/src/app/mails/mail-table-client.tsx)
* Modifier l'affichage de la colonne "Statut & Échéance" pour ajouter un badge rouge discret "En retard" si `new Date(mail.responseDueDate) < new Date()` et que le statut n'est pas résolu :
  ```tsx
  {mail.responseDueDate && mail.status !== 'REPONDU' && mail.status !== 'CLASSE' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', alignItems: 'flex-start' }}>
      {new Date(mail.responseDueDate) < new Date() && (
        <span style={{ 
          padding: '0.15rem 0.35rem', 
          backgroundColor: '#fee2e2', 
          color: 'var(--danger)', 
          borderRadius: '4px', 
          fontSize: '0.7rem', 
          fontWeight: 600 
        }}>
          En retard
        </span>
      )}
      <div style={{ fontSize: '0.75rem', color: new Date(mail.responseDueDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
        <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
        {new Date(mail.responseDueDate).toLocaleDateString('fr-FR')}
      </div>
    </div>
  )}
  ```

---

## Verification Plan

### Automated Tests
* Lancer la compilation de contrôle :
  ```powershell
  npx tsc --noEmit
  ```
* Lancer le linter :
  ```powershell
  npm run lint
  ```

### Manual Verification
1. Créer un courrier de test avec une date d'échéance dépassée (ex: hier) et le statut "RECU".
2. Vérifier que la bulle rouge à côté de **Courriers** dans le menu de gauche s'affiche avec le nombre approprié.
3. Aller sur la page de liste des courriers et s'assurer que le badge rouge "En retard" apparaît bien sous le statut du courrier en question.
4. Mettre à jour le statut du courrier de test à "Répondu" (ou "Classé") et s'assurer que le badge et la bulle de notification disparaissent.

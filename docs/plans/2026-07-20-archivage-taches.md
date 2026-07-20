# Plan d'implémentation : Archivage & Filtrage Automatique des Tâches Terminées

**Objectif** : Masquer les tâches terminées/annulées de la vue principale par défaut, créer un onglet d'archives dédié `📦 Archives` et optimiser la vue Kanban.  
**Architecture** : Exclusions conditionnelles dans Prisma `whereClause` pour la vue liste et la vue Kanban, et ajout d'un onglet d'archivage avec bascule rapide.  
**Stack Tech** : Next.js 16 (App Router), Prisma Client (PostgreSQL), Lucide Icons, React.

---

## Proposed Changes

### Module Tâches (`src/app/tasks`)

#### [MODIFY] [page.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/page.tsx)
- Mettre à jour `whereClause` pour exclure les tâches terminées et annulées par défaut (`status: { notIn: ['TERMINEE', 'ANNULEE'] }`), sauf si `filter === 'archived'`, `status === 'TERMINEE' | 'ANNULEE'`, ou `includeCompleted === 'true'`.
- Ajouter l'onglet `📦 Archives (Terminées & Annulées)` dans la barre de navigation.
- Ajouter un interrupteur rapide *"Afficher les terminées"* via le paramètre URL `includeCompleted`.

#### [MODIFY] [kanban/page.tsx](file:///d:/Téléchargements/CDC/src/app/tasks/kanban/page.tsx)
- Masquer les colonnes `TERMINEE` et `ANNULEE` du Kanban par défaut.
- Ajouter le paramètre `includeCompleted` pour afficher ces colonnes à la demande via un bouton d'extension d'en-tête.

---

## Plan d'Exécution Étape par Étape

### Étape 1 : Modification du filtrage dans `src/app/tasks/page.tsx`
- Adapter le calcul de `whereClause` pour appliquer l'exclusion par défaut des tâches avec statut `TERMINEE` et `ANNULEE`.
- Gérer le cas `filter === 'archived'` pour renvoyer uniquement les tâches terminées ou annulées.

### Étape 2 : Ajout des onglets et boutons d'action visuels
- Ajouter le bouton d'onglet `📦 Archives` dans la barre des filtres rapides.
- Ajouter l'interrupteur *"Inclure les terminées"* pour basculer facilement.

### Étape 3 : Optimisation du Kanban (`src/app/tasks/kanban/page.tsx`)
- Ne charger que les 3 colonnes actives (`A_FAIRE`, `EN_COURS`, `EN_ATTENTE`) par défaut.
- Permettre d'afficher les colonnes terminées via `includeCompleted=true`.

### Étape 4 : Validation & Compilation
- Exécuter `npx tsc --noEmit` pour s'assurer qu'il n'y a pas d'erreur de typage.
- Commit git & Déploiement sur le VPS Hostinger.

---

## Verification Plan

### Automated Tests
- `npx tsc --noEmit`

### Manual Verification
- Naviguer sur `/tasks` : vérifier que seules les tâches actives sont affichées par défaut.
- Cliquer sur `📦 Archives` : vérifier que seules les tâches terminées et annulées sont listées.
- Naviguer sur `/tasks/kanban` : vérifier les 3 colonnes de travail propre et le bouton d'affichage complet.

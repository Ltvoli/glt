# Module Paramètres (Settings)

Ce document décrit le fonctionnement de la section d'administration globale du SaaS (Phase 11.6).

## Accès et Sécurité
- **Route :** `/settings`
- **Rôle nécessaire :** L'accès est strictement réservé aux utilisateurs ayant le rôle `SUPERADMIN` ou `ADMIN` (ce qui couvre les profils comme Lionel et Magali).
- Le composant `requireSettingsAccess()` (dans `src/lib/settings-auth.ts`) valide les permissions et bloque tout accès par URL directe des rôles non autorisés.

## Paramètres Généraux
- Configuration du nom du site, de l'adresse du bureau, du nom du député, etc.
- Accessibles via `/settings/general`.
- Les valeurs sont persistées dynamiquement dans la table `AppSetting`.

## Gestion des Listes & Contacts
- La table générique `SystemList` permet de gérer les différentes listes (types de contacts, sources, statuts, niveaux d'urgence) sans casser les types `String` initiaux du modèle Prisma.
- Accessibles via les sous-menus `/settings/contacts`, `/settings/courriers`, etc.

## Tags
- La gestion globale des tags permet de renommer, fusionner ou désactiver des étiquettes (Soft Delete).
- Les **tags sensibles** ne sont exposés qu'aux administrateurs.

## Niveaux de Soutien & RGPD ⚠️
- Les qualifications d'opinion (Soutien fort, Opposant) constituent des **données sensibles** au sens du RGPD.
- **Règles :** 
  - Historisation systématique dans la table `ContactSupportLevelHistory`.
  - Non exportables par défaut pour les collaborateurs.
  - Champ masqué sur les profils `USER` normaux.

## Envois & Modèles
- Table `MessageTemplate` : Paramétrage des SMS, Emails (Brevo) et messages WhatsApp.
- Possibilité d'intégrer des variables (ex: `{{prenom}}`).

## Intégrations & API
- **Webhooks & Clés :** Gérés dans `/settings/integrations`.
- Les clés API (Brevo, Google Calendar) ne sont **jamais** réaffichées en clair après enregistrement. Seul le hash est conservé en BDD dans la table `ApiKey`.

## Automatisations
- Lancement de tâches asynchrones récurrentes stockées dans `AutomationRule`.
- Seuls les administrateurs peuvent lancer les scripts manuellement depuis `/settings/automations`.

## Sauvegardes & Maintenance
- `/settings/exports-backups` liste l'historique des exports (et bloque les données sensibles selon les rôles).
- L'audit des modifications est enregistré de manière centralisée dans `AuditLog`.

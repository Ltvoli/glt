# Plan d'implémentation : Refonte Globale du Module Courriers

**Objectif** : Refondre le module Courriers en y intégrant un éditeur en ligne de modèles, la génération directe de PDF officiels, l'envoi de mail, et un workflow de validation doté d'un comparateur de versions visuel.
**Architecture** : Ajout du support HTML aux modèles dans la base de données PostgreSQL via Prisma, implémentation d'un éditeur WYSIWYG dans la console d'administration, création d'une vue d'aperçu A4 imprimable pour la génération PDF, et enrichissement de la page de validation avec comparaison de textes (Diff).
**Stack Tech** : Next.js 16 (App Router), Prisma, Tailwind-like CSS, Brevo API.

---

## 📋 Liste des Tâches par Composant

### 1. Base de Données & Schéma Prisma
- `[ ]` Modifier `prisma/schema.prisma` pour ajouter `htmlContent String?` à la table `DocumentTemplate`.
- `[ ]` Exécuter `npx prisma generate` localement pour mettre à jour les types TypeScript de Prisma Client.

### 2. Administration des Modèles (Éditeur WYSIWYG)
- `[ ]` Modifier la page de création/édition de modèle dans `/admin/templates/docs` pour intégrer un éditeur de texte en ligne au lieu d'un simple téléversement de fichier.
- `[ ]` Intégrer un panneau d'aide affichant la liste des variables disponibles (`{en_tete_officielle}`, `{signature_elu}`, `{civilite_expediteur}`, etc.) avec insertion automatique au clic.
- `[ ]` Adapter les server actions de sauvegarde de modèle pour persister le contenu dans le champ `htmlContent`.

### 3. Aperçu A4 & Moteur de Génération PDF
- `[ ]` Créer une route d'aperçu de la lettre `/mails/[id]/preview` qui rend uniquement le modèle de lettre sélectionné avec les variables de fusion remplacées.
- `[ ]` Écrire le style CSS de simulation de page A4 (dimensions réelles, marges, styles spécifiques `@media print`).
- `[ ]` Câbler le bouton de téléchargement PDF natif (`window.print()`).
- `[ ]` Ajouter l'action d'enregistrement automatique du PDF dans les documents de la fiche courrier CRM.
- `[ ]` Ajouter l'action d'envoi du courrier PDF par e-mail en pièce jointe via l'intégration Brevo.

### 4. Validation & Comparateur de Versions (Diff)
- `[ ]` Implémenter l'alerte e-mail aux administrateurs (via Brevo) lors de la soumission d'un brouillon courrier.
- `[ ]` Écrire un utilitaire de comparaison de texte (Diff de mots en Vanilla JS) comparant la version actuelle avec la version précédente stockée dans `MailVersion`.
- `[ ]` Intégrer ce comparateur dans la vue de validation des courriers en attente (`/mails/validation` et `/mails/[id]`).

---

## 🧪 Plan de Vérification

- Lancer la compilation de contrôle : `npx tsc --noEmit`
- Déployer sur le VPS de production.
- Valider manuellement le flux complet : création d'un modèle en ligne -> rédaction d'un courrier -> soumission pour validation -> examen du diff par l'administrateur -> génération et enregistrement automatique du PDF.

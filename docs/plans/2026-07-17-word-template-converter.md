# Plan d'implémentation : Convertisseur de Modèles Word par IA

**Objectif** : Permettre d'importer un fichier Word (.docx) et d'utiliser l'IA pour générer automatiquement un modèle en ligne avec les balises de fusion CRM adaptées.
**Architecture** : Création d'un utilitaire d'extraction de texte DOCX, intégration d'une action appelant l'API Gemini pour convertir le texte brut en HTML avec balises CRM, et ajout d'un bouton d'importation dans l'interface d'administration.
**Stack Tech** : Next.js 16 (Server Actions), Pizzip, Gemini API (SDK).

---

## 📋 Liste des Tâches

### 1. Utilitaire d'Extraction

#### [NEW] [docx-extractor.ts](file:///d:/Téléchargements/CDC/src/lib/docx-extractor.ts)
- Écrire la fonction `extractDocxText(buffer: Buffer): string` :
  - Ouvrir le buffer avec `PizZip`.
  - Lire et extraire le texte des en-têtes (`word/header1.xml`...), du corps (`word/document.xml`) et des pieds de page (`word/footer1.xml`...).
  - Nettoyer les balises XML pour renvoyer le texte structuré par paragraphe.

---

### 2. Service IA & Server Action

#### [MODIFY] [actions.ts](file:///d:/Téléchargements/CDC/src/app/admin/templates/docs/actions.ts) (ou création si inexistant)
- Créer/Modifier le fichier d'actions d'administration des modèles pour ajouter `convertDocxToTemplateAction(base64Docx: string): Promise<{ success: boolean, htmlContent?: string, error?: string }>` :
  - Décoder le fichier Word.
  - Appeler `extractDocxText`.
  - Appeler l'API Gemini (via le modèle configuré, ex: `gemini-2.5-flash` ou similaire disponible dans `src/lib/gemini.ts`) avec le prompt de structuration en HTML et remplacement des balises.
  - Retourner l'HTML résultant.

---

### 3. Interface Utilisateur Administrateur

#### [MODIFY] [templates-client.tsx](file:///d:/Téléchargements/CDC/src/app/admin/templates/docs/templates-client.tsx)
- Ajouter un bouton **« Importer un fichier Word par IA »** à côté du titre.
- Ouvrir un sélecteur de fichier lors du clic.
- Lors de la sélection d'un fichier `.docx`, le convertir en base64, appeler `convertDocxToTemplateAction`, et injecter l'HTML retourné dans le champ `htmlContent`.

---

## 🧪 Plan de Vérification

- Lancer la compilation de contrôle : `npx tsc --noEmit`
- Déployer sur le VPS.
- Tester l'import d'un fichier Word d'en-tête officiel et vérifier que le modèle HTML généré contient bien les balises `{en_tete_officielle}` et `{corps_reponse}` insérées automatiquement par l'IA.

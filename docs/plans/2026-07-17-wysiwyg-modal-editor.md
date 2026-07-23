# Plan d'implémentation : Éditeur WYSIWYG en Modale Plein Écran

**Objectif** : Remplacer l'éditeur HTML brut par un éditeur WYSIWYG visuel (Quill.js) logé dans une modale plein écran (95% viewport).

---

## 📋 Liste des Tâches

### 1. Intégration de Quill et de la Modale

#### [MODIFY] [templates-client.tsx](file:///d:/Téléchargements/CDC/src/app/admin/templates/docs/templates-client.tsx)
- Ajouter l'état `isModalOpen` pour contrôler l'affichage de la modale.
- Charger dynamiquement la feuille de style Quill (`quill.snow.css`) et le script Quill.js depuis un CDN sur le client.
- Modifier le conteneur du formulaire pour qu'il s'affiche sous forme d'une modale plein écran centrée (largeur 95%, hauteur 90%, scrollable).
- Remplacer le `<textarea>` d'édition HTML par un `<div id="editor-container">` piloté par l'instance de Quill.
- Adapter `insertVariable` pour utiliser la sélection/curseur de Quill.
- Modifier les boutons d'ouverture :
  - Ajouter un bouton de création **« + Nouveau modèle »** sur la page principale qui ouvre la modale.
  - Cliquer sur un modèle existant dans la liste ouvre également la modale pré-remplie en mode édition.

---

## 🧪 Plan de Vérification

- Lancer la compilation : `npx tsc --noEmit`.
- Déployer sur le VPS.
- Ouvrir un modèle, modifier le texte, insérer une variable par clic curseur, enregistrer, et vérifier que la modification est immédiate et sans faille.

# Educ Bénin — Dossier de référence design

Ce dossier contient tout ce qu'il faut pour que la construction réelle de la plateforme
(dans le dépôt izikit, via Claude dans Antigravity) suive le design de ce prototype à
la lettre.

## Contenu

- **`educbenin-prototype.html`** — le prototype interactif source (à ouvrir dans un
  navigateur ; 15 écrans, bascule Bureau/Mobile en haut à droite). Audité intégralement
  (tous écrans, tous scénarios, aucune erreur console) puis corrigé selon tes retours :
  formulaire d'authentification (bouton d'envoi + aperçu conforme au vrai formulaire),
  suppression du bouton « Fusionner en un seul PDF », regroupement des KPI du tableau de
  bord, les 27 vraies spécialités avec dates/heures/salles, accordéon en place sur la
  page Spécialités, et le texte corrigé sur le multi-spécialités.
- **`DESIGN-SPEC.md`** — la spécification écran par écran (palette exacte, typographie,
  layout, copy réelle, logique fonctionnelle, différences mobile). C'est le document
  que Claude dans Antigravity doit suivre à la lettre.
- **`screenshots/`** — 57 captures desktop et mobile de chaque écran et de leurs états
  interactifs importants, référencées depuis `DESIGN-SPEC.md`.
- **`ANTIGRAVITY-PROMPTS.md`** — la méthode à suivre : où déposer ces fichiers dans le
  dépôt izikit, le prompt permanent à ajouter au `CLAUDE.md` du dépôt, le prompt ponctuel
  à coller à chaque nouvelle tâche d'écran, et l'explication de pourquoi Banani n'a
  jamais été le problème.

## Ordre de lecture conseillé

1. `ANTIGRAVITY-PROMPTS.md` (la méthode).
2. `DESIGN-SPEC.md`, au moins la section « Fondations de design ».
3. Les captures dans `screenshots/`, en parallèle du document.
4. Ouvre `educbenin-prototype.html` toi-même si tu veux naviguer dedans en direct.

# Les 17 prompts prêts à copier — fondations + un par écran

Ce fichier est une vue d'ensemble, pour t'y retrouver. **Pour copier-coller sans risque de te tromper, utilise plutôt le dossier `prompts-par-ecran/` fourni à côté** : un petit fichier par étape, qui ne contient QUE le prompt final, rien d'autre — tu ouvres le fichier du bon numéro, Ctrl+A, copie, colle, envoie.

Chaque prompt d'écran combine maintenant deux choses dans le même bloc : la partie design (comme avant — lire la spec, regarder les captures, reproduire à la lettre) et une partie "Comportement backend pour cet écran" à la fin, pour que l'application se construise avec sa vraie logique au fur et à mesure, écran par écran, plutôt que tout le backend d'un coup à la fin.

**Ordre à respecter, impératif :**

1. Commence TOUJOURS par `00-fondations-backend.md` — une seule fois, avant tout écran. Il définit le modèle de données complet de l'application (dossiers, spécialités, comptes back-office, tarifs). Tous les prompts suivants s'appuient dessus et ne doivent jamais le redéfinir.
2. Puis les écrans 1 à 15, dans l'ordre (site public, puis back-office) — certains écrans (dashboard, dossiers) réutilisent des composants des écrans précédents.
3. Le fichier 16 (formulaire d'authentification de diplôme) peut être construit dès que l'écran 10 (Dossiers) est en place, puisque c'est ce dernier qui génère le lien envoyé au candidat.

| # | Fichier à ouvrir | Écran | Captures utilisées |
|---|---|---|---|
| 0 | `prompts-par-ecran/00-fondations-backend.md` | Fondations backend (à faire en premier, une seule fois) | — |
| 1 | `prompts-par-ecran/01-accueil.md` | Accueil | 01, 02, 56 |
| 2 | `prompts-par-ecran/02-accompagnement-demande.md` | Accompagnement & demande | 03 à 12 |
| 3 | `prompts-par-ecran/03-suivre-mon-dossier.md` | Suivre mon dossier | 13 à 19 |
| 4 | `prompts-par-ecran/04-specialites.md` | Spécialités | 20 à 22 |
| 5 | `prompts-par-ecran/05-mentions-legales.md` | Mentions légales | 23, 24 |
| 6 | `prompts-par-ecran/06-cgu-cgv.md` | CGU / CGV | 25, 26 |
| 7 | `prompts-par-ecran/07-confidentialite.md` | Politique de confidentialité | 27, 28 |
| 8 | `prompts-par-ecran/08-connexion.md` | Connexion (back-office) | 29, 30 |
| 9 | `prompts-par-ecran/09-tableau-de-bord.md` | Tableau de bord (back-office) | 31, 32, 57 |
| 10 | `prompts-par-ecran/10-dossiers.md` | Dossiers (back-office) | 33 à 45 |
| 11 | `prompts-par-ecran/11-dossiers-rejetes.md` | Dossiers rejetés (back-office) | 46, 47 |
| 12 | `prompts-par-ecran/12-specialites-whatsapp.md` | Spécialités & WhatsApp (back-office) | 48, 49 |
| 13 | `prompts-par-ecran/13-tarifs.md` | Tarifs (back-office) | 50, 51 |
| 14 | `prompts-par-ecran/14-comptes-admin.md` | Comptes admin & rôles (back-office) | 52, 53 |
| 15 | `prompts-par-ecran/15-parametres.md` | Paramètres (back-office) | 54, 55 |
| 16 | `prompts-par-ecran/16-formulaire-authentification-diplome.md` | Formulaire d'authentification de diplôme (candidat, via lien WhatsApp) | 45 (aperçu back-office de référence) |

Pour les écrans 5, 6 et 7 (pages légales), la partie backend dit explicitement qu'il n'y en a pas — ce sont des pages de contenu statique.

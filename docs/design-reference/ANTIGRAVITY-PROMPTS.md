# Comment faire suivre ce design à la lettre par Claude dans Antigravity

## D'abord : le malentendu sur Banani

`banani-design-implementation` n'est **pas** un comportement par défaut qui « prend le dessus » sur tes propres fichiers. En lisant le `CLAUDE.md` du dépôt izikit, cette compétence ne se déclenche que dans deux cas précis : soit tu écris explicitement une phrase du genre *« construis cet écran depuis Banani »* / *« reproduis cette capture Banani »*, soit un vrai serveur MCP Banani est connecté à la session. Aucun des deux ne s'applique à ton projet — tu n'utilises pas Banani. Il n'y a donc rien à « désactiver » ou à « faire basculer ».

Ce qui s'est réellement passé quand tu déposais des captures ou des fichiers sans qu'ils soient suivis, c'est autre chose : le dépôt izikit embarque une **deuxième** compétence, `ui-ux-pro-max`, beaucoup plus générale, qui se déclenche dès qu'une demande ressemble à « conçois/améliore/revois cet écran ». Cette compétence a sa propre bibliothèque de styles, palettes et polices — et si rien ne lui dit explicitement de s'en tenir à *tes* choix, elle propose les siens. Ajoute à cela qu'un fichier simplement déposé dans une conversation n'est pas automatiquement traité comme une source de vérité à suivre à la lettre : sans instruction explicite, l'agent le regarde, s'en inspire, mais garde sa propre latitude créative.

**La vraie solution n'est donc pas de contourner Banani, mais de fixer deux choses :**
1. Faire de `DESIGN-SPEC.md` (et des captures + du prototype) la **source de vérité unique et obligatoire**, référencée dans le `CLAUDE.md` du dépôt — donc chargée automatiquement à chaque session, plutôt que dépendante d'un rappel ponctuel dans le chat.
2. Dire explicitement à l'agent de **ne pas laisser `ui-ux-pro-max` (ou tout autre réflexe de design) proposer sa propre palette, ses propres polices ou son propre style** — puisque tout est déjà spécifié dans le document.

C'est l'objet des deux prompts ci-dessous : le premier est permanent (il vit dans `CLAUDE.md`), le second est à coller en début de session de travail. **Les deux sont nécessaires** — le premier pose le cadre une fois pour toutes, mais un agent de code ne relit pas forcément un fichier de contexte en profondeur avant chaque tâche ; le second force, à chaque lancement de travail, la lecture réelle des documents avant la moindre ligne de code. Sans le second, le premier reste souvent une instruction "de fond" qui s'applique mollement.

---

## Où déposer les fichiers dans le dépôt izikit

Avant de coller les prompts, place ce dossier (ou son contenu) à la racine du dépôt, par exemple sous :

```
docs/design-reference/
├── DESIGN-SPEC.md
├── educbenin-prototype.html
└── screenshots/
    └── (57 fichiers .png)
```

Ce guide est accompagné de deux petits fichiers séparés, à usage unique : **copier leur contenu intégral, rien d'autre.** Ils existent justement pour éviter toute ambiguïté sur "où commence / où s'arrête" le texte à coller — contrairement à un extrait affiché au milieu de ce guide, un fichier à part n'a pas de bordure à deviner : tu l'ouvres, tu sélectionnes tout (Ctrl+A ou Cmd+A), tu copies, tu colles. Rien à couper, rien à retirer.

- `prompt-1-claude-md.md` → à coller dans `CLAUDE.md` (voir Prompt 1 ci-dessous).
- `prompt-2-kickoff-ecran-template.md` → modèle à adapter et coller en début de chaque tâche d'écran (voir Prompt 2 ci-dessous).

---

## Prompt 1 — à ajouter dans `CLAUDE.md` (permanent)

Ouvre le fichier **`prompt-1-claude-md.md`** fourni à côté de ce guide, sélectionne tout son contenu (Ctrl+A / Cmd+A), copie-le, et colle-le à la fin du `CLAUDE.md` existant du dépôt izikit (ne remplace rien, ajoute une nouvelle section à la suite de ce qui existe déjà).

> Aperçu de ce que contient ce fichier, pour référence — **ne copie pas depuis l'aperçu ci-dessous**, sers-toi du fichier lui-même :
>
> Le fichier commence par `## Design produit — Educ Bénin (référence obligatoire)`, présente le produit en un paragraphe, pointe vers `DESIGN-SPEC.md` / `screenshots/` / `educbenin-prototype.html` comme source de vérité unique, puis liste 5 règles strictes (lire la spec avant de coder, ne jamais laisser une compétence de design par défaut comme `ui-ux-pro-max` proposer sa propre palette, ignorer `banani-design-implementation`, ne pas copier le style des templates `examples/frontend-pages/`, signaler plutôt qu'inventer tout détail non couvert). Le fichier se termine sur la règle 5, sans rien après.

---

## Prompt 2 — à coller en début de session de travail (ponctuel, à répéter à chaque nouvelle tâche d'écran)

Ouvre le fichier **`prompt-2-kickoff-ecran-template.md`**, sélectionne tout, copie-le, colle-le dans ton message à Claude/Antigravity, puis remplace les deux occurrences de `[NOM DE L'ÉCRAN]` par l'écran du jour (garde le reste tel quel). Ce fichier est un modèle générique — c'est normal de le modifier avant de l'envoyer, contrairement au Prompt 1 qui doit être collé sans aucune retouche.

**Exemple concret pour la toute première tâche** (l'écran d'accueil), une fois `[NOM DE L'ÉCRAN]` remplacé :

```
Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 1. Accueil »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 01 à 04).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente la page d'accueil en suivant ce document à la lettre : mêmes couleurs
(valeurs hexadécimales exactes), mêmes polices, même structure de layout (y compris le
réordonnancement de la hero section entre desktop et mobile via grid-template-areas),
même copy, même logique d'interaction, mêmes différences desktop/mobile. N'invente aucune
variation de style. Si un détail de comportement n'est pas couvert par le document,
demande-moi avant de décider toi-même.
```

(Cet exemple-là est déjà complet et prêt à l'emploi tel quel — c'est uniquement le modèle générique du fichier `prompt-2-kickoff-ecran-template.md` qui a besoin d'être adapté à chaque nouvel écran.)

---

## Pourquoi cette méthode plutôt qu'un cahier des charges classique

Tu as raison de vouloir que tout soit irréprochable ici plutôt que de t'appuyer sur un cahier des charges séparé que tu ne comptes pas rédiger en parallèle : un agent de code suit beaucoup plus fidèlement un exemple concret (captures + code source du prototype) qu'une description abstraite. La combinaison captures + spécification écrite + prototype HTML source (que l'agent peut ouvrir et lire directement si besoin) couvre les trois niveaux dont il a besoin : *ce que ça doit donner visuellement*, *pourquoi* (les valeurs exactes et la logique), et *comment c'est déjà fait* (le code de référence). C'est cette combinaison, posée une fois dans `CLAUDE.md` et réaffirmée à chaque tâche via le prompt 2, qui remplace efficacement un cahier des charges classique pour la partie design.

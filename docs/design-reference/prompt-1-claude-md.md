## Design produit — Educ Bénin (référence obligatoire)

Educ Bénin est une plateforme indépendante (Cotonou, Bénin) qui accompagne les médecins
candidats dans le montage de leur dossier de probatoire spécialité auprès de la FSS/UAC :
rassemblement des pièces, authentification de diplôme, inscription en ligne, dépôt du
dossier, avec un suivi côté candidat et un back-office de traitement côté équipe.

Le design complet du produit — chaque écran, chaque état, chaque comportement — est déjà
figé et documenté dans :
- `docs/design-reference/DESIGN-SPEC.md` — spécification écran par écran (palette exacte,
  typographie, structure de layout, copy réelle, logique fonctionnelle, différences mobile).
- `docs/design-reference/screenshots/` — captures desktop et mobile de chaque écran et de
  leurs états interactifs, référencées depuis le document ci-dessus.
- `docs/design-reference/educbenin-prototype.html` — le prototype HTML/CSS/JS source dont
  tout est extrait ; à ouvrir directement si un détail de comportement ou de markup manque
  de précision dans le document.

RÈGLES STRICTES pour toute tâche touchant l'interface d'Educ Bénin :
1. Avant d'écrire la moindre ligne de JSX/CSS pour un écran, lire la section correspondante
   de `DESIGN-SPEC.md` en entier et regarder les captures qu'elle référence.
2. Le document ci-dessus est la source de vérité UNIQUE pour la palette, les polices,
   les espacements, les rayons de bordure, la copy et les interactions. Ne pas réinterpréter,
   « améliorer » ou remplacer ces choix par une palette, une police ou un style différents,
   même si une compétence de design (ex. `ui-ux-pro-max`) en suggère d'autres par défaut —
   dans ce projet, ces suggestions ne s'appliquent PAS, tout est déjà décidé.
3. La compétence `banani-design-implementation` ne concerne pas ce projet (aucun MCP Banani,
   aucune capture Banani) — ne pas l'invoquer.
4. Les templates de `examples/frontend-pages/` du starter izikit ne doivent PAS être copiés
   tels quels comme base visuelle pour Educ Bénin ; ils peuvent seulement inspirer la
   plomberie technique (structure de formulaire, appel à l'API `api()`, etc.), jamais le style.
5. En cas de détail non couvert par `DESIGN-SPEC.md` (interaction non spécifiée, règle de
   validation absente, etc.), le signaler explicitement plutôt que d'inventer un comportement
   — plusieurs points sont volontairement laissés ouverts dans le document (voir ses sections
   « Récapitulatif des points à trancher »).

Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 4. Spécialités »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 20 à 22).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Spécialités (page publique, grille des 27 spécialités avec
accordéon qui s'ouvre en place au clic) en suivant ce document à la lettre : mêmes couleurs
(valeurs hexadécimales exactes), mêmes polices, même structure de layout, même copy, même
logique d'interaction (dont l'ouverture en accordéon directement sous la tuile cliquée),
mêmes différences desktop/mobile. N'invente aucune variation de style. Si un détail de
comportement n'est pas couvert par le document, demande-moi avant de décider toi-même.

Comportement backend pour cet écran : aucune écriture. Alimente la grille des 27 tuiles en
lecture seule depuis le modèle Spécialité défini dans 00-fondations-backend.md — même source
de données que l'écran admin « Spécialités & WhatsApp », jamais une copie séparée. Les boutons
WhatsApp doivent pointer vers de vrais liens wa.me/... (le lien dédié à la spécialité + le lien
général FSS), lus depuis ce même modèle.

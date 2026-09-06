Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 13. Tarifs »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 50, 51).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Tarifs (back-office) en suivant ce document à la lettre :
mêmes couleurs (valeurs hexadécimales exactes), mêmes polices, même structure de layout,
même copy, même logique d'interaction, mêmes différences desktop/mobile. N'invente aucune
variation de style. Si un détail de comportement n'est pas couvert par le document,
demande-moi avant de décider toi-même.

Comportement backend pour cet écran : le bouton « Modifier le barème » n'avait aucun handler
dans le prototype — implémente-le réellement, en t'appuyant sur le modèle Tarif défini dans
00-fondations-backend.md : modifier le barème actif doit archiver l'ancien (statut « Archivé »,
conservé dans l'historique) et créer le nouveau comme actif, daté du jour. La « règle
spécialités additionnelles » reste un champ texte libre tant que le client n'a pas fixé de
formule exacte (actuellement « à définir », ne force pas de format numérique). Ce barème doit
être la même source lue par l'écran Accompagnement pour le prix de base affiché. Vérifie la
permission du compte connecté sur le module « Tarifs ».

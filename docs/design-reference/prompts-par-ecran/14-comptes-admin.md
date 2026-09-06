Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 14. Comptes admin &
rôles »), et regarde les captures qu'elle référence dans
docs/design-reference/screenshots/ (fichiers 52, 53).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Comptes admin & rôles (back-office) en suivant ce document à
la lettre : mêmes couleurs (valeurs hexadécimales exactes), mêmes polices, même structure
de layout, même copy, même logique d'interaction, mêmes différences desktop/mobile.
N'invente aucune variation de style. Si un détail de comportement n'est pas couvert par le
document, demande-moi avant de décider toi-même.

Comportement backend pour cet écran : la table de permissions était en lecture seule et le
bouton « + Inviter un membre » n'avait aucun handler dans le prototype — implémente réellement
l'invitation (création d'un Compte back-office défini dans 00-fondations-backend.md, avec ses
permissions par module) et rends la table éditable (changer le niveau de permission d'un membre
pour un module). Seul un compte ayant la permission « Gérer » sur le module « Comptes admin »
peut modifier les permissions d'un autre compte — vérifie-le à chaque action.

Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 8. Connexion »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 29, 30).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Connexion (back-office) en suivant ce document à la lettre :
mêmes couleurs (valeurs hexadécimales exactes), mêmes polices, même structure de layout,
même copy, même logique d'interaction, mêmes différences desktop/mobile. N'invente aucune
variation de style. Si un détail de comportement n'est pas couvert par le document,
demande-moi avant de décider toi-même.

Comportement backend pour cet écran : implémente une vraie authentification back-office
(e-mail/mot de passe + connexion Google), en t'appuyant sur le modèle Compte back-office défini
dans 00-fondations-backend.md — remplace la navigation directe sans vérification du prototype
par une vraie création de session, avec message d'erreur clair en cas d'identifiants invalides.
Aucune inscription en libre-service : les comptes back-office sont créés depuis l'écran
« Comptes admin & rôles », pas depuis cet écran.

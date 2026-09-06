Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 15. Paramètres »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 54, 55).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Paramètres (back-office) en suivant ce document à la lettre :
mêmes couleurs (valeurs hexadécimales exactes), mêmes polices, même structure de layout,
même copy, même logique d'interaction, mêmes différences desktop/mobile. N'invente aucune
variation de style. Si un détail de comportement n'est pas couvert par le document,
demande-moi avant de décider toi-même.

Comportement backend pour cet écran : « Enregistrer les modifications » n'avait aucun handler
dans le prototype — implémente la vraie mise à jour du profil (nom, e-mail, mot de passe) du
compte back-office connecté, en t'appuyant sur le modèle défini dans 00-fondations-backend.md ;
un changement de mot de passe doit redemander le mot de passe actuel. « Se déconnecter » doit
réellement invalider la session (pas seulement naviguer vers l'écran Connexion, comme dans le
prototype).

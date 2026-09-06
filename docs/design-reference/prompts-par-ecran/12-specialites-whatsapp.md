Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 12. Spécialités &
WhatsApp »), et regarde les captures qu'elle référence dans
docs/design-reference/screenshots/ (fichiers 48, 49).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Spécialités & WhatsApp (back-office, gestion des 27 spécialités
et des numéros WhatsApp associés) en suivant ce document à la lettre : mêmes couleurs
(valeurs hexadécimales exactes), mêmes polices, même structure de layout, même copy, même
logique d'interaction, mêmes différences desktop/mobile. N'invente aucune variation de
style. Si un détail de comportement n'est pas couvert par le document, demande-moi avant
de décider toi-même.

Comportement backend pour cet écran : les boutons « Enregistrer et propager » et « Modifier »
par ligne n'avaient aucun handler dans le prototype — implémente-les réellement : ils doivent
écrire dans le même modèle Spécialité défini dans 00-fondations-backend.md, qui est la source
unique lue aussi par l'écran public « Spécialités » et par la page d'accueil — une modification
ici doit donc se répercuter automatiquement partout ailleurs, sans copie séparée. Le champ
« Lien du groupe WhatsApp FSS » modifie le lien général partagé par les 27 fiches ; les liens
WhatsApp par spécialité sont modifiés ligne par ligne. Vérifie la permission du compte connecté
sur le module « Spécialités & WhatsApp » avant d'autoriser l'écriture.

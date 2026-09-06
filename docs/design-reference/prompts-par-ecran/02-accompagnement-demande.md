Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 2. Accompagnement & demande »),
et regarde les captures qu'elle référence dans docs/design-reference/screenshots/
(fichiers 03 à 12).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Accompagnement & demande (formulaire public multi-étapes,
avec le cas multi-spécialités) en suivant ce document à la lettre : mêmes couleurs
(valeurs hexadécimales exactes), mêmes polices, même structure de layout, même copy,
même logique d'interaction (dont la validation à chaque étape), mêmes différences
desktop/mobile. N'invente aucune variation de style. Si un détail de comportement n'est
pas couvert par le document, demande-moi avant de décider toi-même.

Comportement backend pour cet écran : à la soumission du formulaire (étape 3), crée un
nouveau Dossier (modèle défini dans 00-fondations-backend.md) avec étape = 1, spécialité(s)
sélectionnée(s), nom/prénom/numéro WhatsApp saisis, et le PDF unique déposé. Génère la
référence de dossier réellement à la création (ne réutilise jamais "EB-2026-000482" en dur,
c'était une valeur d'exemple du prototype) et affiche-la sur l'écran de confirmation. Aucune
règle de validation de champs n'existait dans le prototype (aucun champ requis) — demande-moi
la règle exacte avant d'en ajouter une. La règle tarifaire multi-spécialités n'est pas encore
fixée (voir 00-fondations-backend.md) : n'affiche donc pas de montant calculé automatiquement,
garde le texte "Tarif multi-spécialités communiqué avant confirmation." tel quel.

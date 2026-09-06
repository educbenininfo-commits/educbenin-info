Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 3. Suivre mon dossier »),
et regarde les captures qu'elle référence dans docs/design-reference/screenshots/
(fichiers 13 à 19).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Suivre mon dossier (page publique, y compris les différents
états d'avancement et le cas dossier rejeté) en suivant ce document à la lettre : mêmes
couleurs (valeurs hexadécimales exactes), mêmes polices, même structure de layout, même
copy, même logique d'interaction, mêmes différences desktop/mobile. N'invente aucune
variation de style. Si un détail de comportement n'est pas couvert par le document,
demande-moi avant de décider toi-même.

Comportement backend pour cet écran : remplace le sélecteur de démonstration #trackPick par
une vraie recherche — à la soumission du formulaire (référence de dossier + numéro WhatsApp),
cherche le Dossier correspondant dans le modèle défini dans 00-fondations-backend.md et
alimente renderTimeline(stage) avec son étape réelle (garde cette fonction de rendu telle
quelle, seule la source de la donnée change). Si aucun dossier ne correspond, affiche un
message clair plutôt que la frise. À l'étape 3 (Inscription en ligne), le bouton "Transmettre
ma fiche d'inscription" doit réellement uploader le fichier déposé, le lier à ce dossier, et
passer ficheUploaded = true — c'est la même donnée que celle relue ensuite dans l'aperçu
#fichePreview de l'écran Dossiers (back-office), ne la redéfinis pas séparément. Si un motif de
rejet existe (étape 0), affiche-le à la place du texte d'exemple codé en dur.

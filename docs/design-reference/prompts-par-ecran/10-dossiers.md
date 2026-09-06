Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md
(au moins la section « Fondations de design » + la section « 10. Dossiers »), et regarde
les captures qu'elle référence dans docs/design-reference/screenshots/ (fichiers 33 à 45).

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et du
comportement attendu pour cet écran avant d'écrire du code.

Ensuite, implémente l'écran Dossiers (back-office, liste filtrable + modale de détail avec
tous ses états : paiement, authentification de diplôme envoyée/en attente/soumise,
commentaires publics et internes) en suivant ce document à la lettre : mêmes couleurs
(valeurs hexadécimales exactes), mêmes polices, même structure de layout, même copy, même
logique d'interaction, mêmes différences desktop/mobile. N'invente aucune variation de
style. Si un détail de comportement n'est pas couvert par le document, demande-moi avant
de décider toi-même.

Comportement backend pour cet écran (le plus riche de l'application — implémente-le en
t'appuyant sur le modèle Dossier défini dans 00-fondations-backend.md, jamais un modèle
parallèle) :
- La liste et les filtres par étape doivent lire/compter les vrais dossiers, pas les 10
  exemples codés en dur du prototype.
- Conserve exactement la logique déjà écrite dans le prototype (authButtonState,
  ficheButtonState, recepisseButtonState) mais branche-la sur les vraies données :
  authButtonState doit réellement générer un authToken unique et envoyer le lien par WhatsApp
  au clic sur « Envoyer le formulaire d'authentification » (voir l'écran dédié
  16-formulaire-authentification-diplome.md) ; l'aperçu affiché au clic sur « Voir le
  formulaire d'authentification » doit lire le vrai authForm soumis par le candidat.
- Le bouton récépissé (étape 4) doit réellement permettre l'upload du scan par le back-office
  et le stocker sur le dossier (recepisseUploaded = true) — ce handler n'existait pas dans le
  prototype, à construire entièrement.
- Le champ « Motif du rejet » saisi au clic sur « Rejeter le dossier » doit être réellement
  persisté sur le dossier (le prototype le lisait visuellement sans le stocker) — c'est ce
  texte qui doit ensuite apparaître dans la colonne « Motif » de l'écran Dossiers rejetés.
- Chaque action d'écriture (modifier, envoyer/voir formulaire, upload récépissé, ajouter un
  commentaire, rejeter, restaurer, faire avancer l'étape) doit vérifier la permission du compte
  connecté sur le module « Dossiers » (Gérer requis, pas seulement Lecture seule).
- Les commentaires publics et internes doivent être réellement enregistrés et horodatés, avec
  l'auteur = le compte back-office connecté.

Avant de commencer, ouvre et lis entièrement docs/design-reference/DESIGN-SPEC.md (au moins
la section « Fondations de design » et la section « 9. Dossiers » pour le composant
`#authPreview` qui affiche déjà la structure exacte des réponses attendues), et regarde les
captures 58 et 59 (maquette de référence de ce nouvel écran, desktop et mobile) ainsi que la
capture 45 (aperçu de ces mêmes données côté back-office, pour vérifier la correspondance des
champs) dans docs/design-reference/screenshots/. Suis les captures 58/59 à la lettre pour le
layout, les couleurs et la typographie de ce nouvel écran — n'invente aucune variation.

Confirme-moi en une phrase ce que tu as compris de la palette, de la typographie et de la
structure des champs avant d'écrire du code.

Il manque un écran qui n'est documenté nulle part ailleurs dans DESIGN-SPEC.md : le vrai
formulaire d'authentification de diplôme, celui que le candidat reçoit par lien WhatsApp et
remplit lui-même. Ce n'est PAS un Google Form externe — c'est un écran de cette application,
public, accessible sans connexion (les médecins candidats n'ont pas de compte), à l'URL
/authentification-diplome/[token].

Design de l'écran (même système que le reste de l'application — mêmes couleurs, mêmes
polices, même style de carte/formulaire que l'écran Accompagnement) :
- En-tête : numéro de dossier affiché en lecture seule, grisé, pré-rempli automatiquement
  depuis le token (jamais modifiable par le candidat).
- Section « Informations personnelles » : nom, prénom(s), date de naissance, lieu de
  naissance, nationalité, adresse, type de pièce d'identité (select), référence de la pièce
  d'identité, e-mail, téléphone.
- Section « Diplôme du Baccalauréat » : e-mail de l'institution qui l'a délivré, nom de
  l'institution (toujours une institution étatique, jamais une école — exemple de placeholder :
  « Office du Baccalauréat du Bénin »), année d'obtention, pays d'obtention, adresse précise de
  l'institution, upload PDF du diplôme.
- Section « Diplôme du Doctorat » : exactement les mêmes champs que la section Baccalauréat,
  dupliqués pour ce diplôme.
- Encart d'avertissement (style .comment-note existant) : « ⛔ TRÈS IMPORTANT — vous recevrez
  par e-mail, sous quelques jours, une attestation ou un récépissé de dépôt d'authentification
  pour chaque diplôme. Surveillez votre boîte mail. »
- Bouton d'envoi unique en bas.
- Après soumission : écran de confirmation (pas de redirection externe), qui réaffiche le même
  avertissement e-mail.

Comportement backend attendu :
- Le token dans l'URL est un identifiant unique généré côté back-office au moment où l'agent
  clique sur « Envoyer le formulaire d'authentification » (écran Dossiers) — jamais le numéro
  de dossier en clair seul, pour empêcher qu'on devine l'accès au dossier d'un autre candidat.
- À l'ouverture du lien : si le token n'existe pas, a expiré, ou correspond à un dossier qui
  n'est plus à l'étape « Authentification du diplôme en cours », affiche un message clair
  (lien invalide/expiré ou déjà traité) plutôt que le formulaire.
- Si le token est valide et que le formulaire a déjà été soumis, affiche un message « déjà
  soumis » plutôt que de permettre une seconde soumission.
- À la soumission : enregistre tous les champs et les deux fichiers PDF (nommés
  automatiquement « diplôme-nom-prénom-bac » et « diplôme-nom-prénom-doctorat »), marque le
  dossier correspondant `authSubmitted = true` avec horodatage, et remplis l'objet `authForm`
  du dossier avec exactement la même structure de champs que celle déjà affichée dans l'aperçu
  back-office `#authPreview` (écran Dossiers) — réutilise ce même modèle de données, ne le
  redéfinis pas.
- Cette soumission doit apparaître dans le panneau « Activité récente » du Tableau de bord
  (« Formulaire d'authentification reçu »), comme c'est déjà illustré dans le prototype.
- Aucune connexion requise pour accéder à cet écran ; protège-le uniquement par la validité du
  token.

Si un détail n'est pas couvert ici, demande-moi avant de décider toi-même.

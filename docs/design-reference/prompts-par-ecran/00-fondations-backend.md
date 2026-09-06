Avant de construire ou modifier le moindre écran, lis entièrement le cahier des charges v2.2
(EducBenin-CahierDesCharges-v2.2.docx) et DESIGN-SPEC.md dans docs/design-reference/ (toutes
les sections, pas seulement les sections design — les tableaux de contenu de chaque écran
décrivent déjà la forme exacte des données attendues).

Confirme-moi en une phrase ce que tu as compris de l'architecture générale avant d'écrire du
code.

Définis maintenant, une seule fois, le modèle de données complet de l'application — ce sera
la source unique de vérité pour tous les écrans construits ensuite. Ne redéfinis jamais une
variante de ces entités plus tard dans un écran particulier : réutilise-les toujours.

Dossier (candidat) — champs : référence (générée réellement à la création, jamais une valeur
codée en dur), nom, prénom(s), numéro WhatsApp, spécialité(s) (une ou plusieurs, parmi les
27), étape (0 = rejeté, 1 = en cours de traitement, 2 = authentification du diplôme en cours,
3 = inscription en ligne, 4 = dépôt de dossier en cours, 5 = déposé avec succès), date de
création, PDF unique déposé à la demande initiale. Puis, par étape :
- Authentification (étape 2) : authSent (bool), authSentAt, authToken (identifiant unique
  pour le lien du formulaire externe — jamais le numéro de dossier seul), authSubmitted
  (bool), authSubmittedAt, et l'objet complet des réponses soumises (informations
  personnelles + diplôme du Baccalauréat + diplôme du Doctorat + les 2 PDF joints) — reprends
  exactement la structure déjà utilisée dans l'aperçu back-office #authPreview.
- Inscription en ligne (étape 3) : ficheUploaded (bool), fichier de la fiche d'inscription
  transmis par le candidat lui-même depuis sa page de suivi.
- Dépôt (étape 4-5) : recepisseUploaded (bool), fichier du récépissé, uploadé manuellement par
  le back-office (jamais par le candidat).
- Rejet (étape 0) : motif du rejet (texte, saisi par le back-office, visible par le candidat
  sur sa page de suivi).
- Paiement : montant, payé, moyen de paiement (Non renseigné / Mobile Money / Espèces /
  Virement) — le reste à payer est toujours calculé, jamais stocké séparément.
- Commentaires publics (visibles par le candidat) et commentaires internes (jamais visibles
  par le candidat) : chacun une liste d'entrées (auteur, date, texte).

Spécialité — 27 entrées fixes au départ (nom, code, date, heure, salle, lien WhatsApp dédié),
plus un lien WhatsApp général FSS partagé par toutes.

Compte back-office — nom, e-mail, mot de passe (hashé) ou identité Google, et permissions par
module : Dossiers, Rejetés, Spécialités & WhatsApp, Tarifs, Comptes admin — chacune valant
Gérer / Lecture seule / Aucun accès. Chaque action d'écriture doit vérifier la permission du
compte connecté sur le module concerné avant de s'exécuter.

Tarif — barème actif (prix de base, règle multi-spécialités — actuellement "à définir", garde
ce champ en texte libre modifiable tant que le client n'a pas fixé de formule) + historique
des barèmes précédents (même structure, horodaté, statut Actif/Archivé).

Authentification : back-office uniquement — les médecins candidats n'ont jamais de compte.
E-mail/mot de passe + connexion Google pour le back-office. Le candidat accède à ses
informations uniquement via sa référence de dossier + son numéro WhatsApp (page Suivre mon
dossier) ou via le lien à token unique du formulaire d'authentification — jamais par un compte
avec mot de passe.

Points encore ouverts côté métier (garde le modèle flexible, ne fige rien qui empêcherait de
les trancher plus tard sans migration lourde) : règle tarifaire multi-spécialités exacte,
méthode exacte de recherche sur "Suivre mon dossier", automatisation ou non des notifications
WhatsApp (liens manuels pour l'instant), durée de conservation des données (24 mois proposé),
conditions de remboursement en cas de rejet.

Si un choix d'architecture n'est pas couvert ici, demande-moi avant de décider seul.

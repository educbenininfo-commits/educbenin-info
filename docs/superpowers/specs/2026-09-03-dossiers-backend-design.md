# Backend "Dossiers" — design

Status: approved (brainstorming session 2026-09-03) · Author: Claude + Horace Lissanon

## 1. Goal

Every "Dossiers"-related screen built so far (Accompagnement, Suivre mon dossier, back-office
Dossiers/Dossiers rejetés, Tableau de bord's general KPIs) runs on client-side, in-memory
example data ported from `educbenin-prototype.html`. Nothing is persisted. This project
replaces that with a real Prisma-backed domain model and the API routes needed to drive it,
wiring the existing UI to real data instead of the hardcoded examples.

## 2. Scope

**In scope:**
- `Dossier` + `DossierComment` Prisma models.
- Public dossier creation (Accompagnement form submission).
- Public dossier lookup (Suivre mon dossier search).
- Public fiche d'inscription upload (Suivre mon dossier, stage-3 flow).
- A new public screen, `/authentification-diplome/[token]` — the real external
  authentication-of-diploma form the candidate fills after receiving a WhatsApp link. Not
  documented in DESIGN-SPEC.md; fully specified by the user in this session, styled like
  Accompagnement, field-for-field matching the `authForm` shape already shown in the
  back-office preview (`#authPreview`).
- Back-office Dossiers: real list/filter, real modal actions (reject with persisted motif,
  restore, advance stage, payment fields, comments), all through `requireAdmin` + audited via
  `logAdminAction`.
- Back-office Dossiers rejetés: unified with the real `Dossier` model (stage 0 filter) instead
  of its current separate static table.
- Tableau de bord: the 6 general KPI counts, the "dossiers en attente >5 jours" panel, and the
  "activité récente" panel become real. The financial block (encaissements chart, payment
  breakdown) stays example data — no billing/accounting system exists yet.
- Real file uploads via Cloudinary for: the initial dossier PDF, the two diploma PDFs
  (Bac/Doctorat), the fiche d'inscription, and the récépissé — all through a new **public**
  upload path (see §6), since the existing `/api/upload` requires a logged-in session and
  candidates never authenticate.
- The "Envoyer le formulaire d'authentification" action becomes a real `wa.me` deep link
  (pre-filled WhatsApp message, opened client-side) carrying a link to the new
  `/authentification-diplome/[token]` screen — not a WhatsApp Business API integration.

**Explicitly out of scope (separate future work):**
- Any real WhatsApp Business API sending (the deep link is opened and sent manually by staff,
  same as today's real-world workflow).
- Spécialités & WhatsApp / Tarifs / Comptes admin & rôles becoming editable (still static per
  the earlier screens' own scope decisions).
- The financial block on Tableau de bord (chart, payment breakdown by moyen).
- Per-module admin permissions (Comptes admin & rôles stays read-only; authorization keeps
  using the existing global ADMIN/SUPERADMIN role).

## 3. Candidate identity model

Candidates never have an account. A dossier is identified purely by its `reference` +
`whatsapp` pair, matching the design exactly — no additional verification (e.g. OTP) is added.
This was confirmed explicitly: fidelity to the design over extra security, since the design
never implies an account exists.

## 4. Data model

```prisma
model Dossier {
  id                 String   @id @default(cuid())
  reference          String   @unique // "EB-092026-001" — see §5
  nom                String
  prenom             String
  whatsapp           String                // "+229 XX XX XX XX", as typed
  specialtyCodes     String[]              // codes from frontend/src/lib/specialties.ts
  stage              Int      @default(1)  // 0=rejeté, 1..5 as in STAGE_NAMES

  pieceJointeUrl     String?               // initial dossier PDF (Cloudinary)

  authToken          String?  @unique      // random, never the reference — see §7
  authTokenExpiresAt DateTime?
  authSentAt         DateTime?
  authSubmittedAt    DateTime?             // set for real on candidate submission
  authFormData       Json?                 // same shape as today's `AuthForm` type
  diplomaBacUrl      String?
  diplomaDoctoratUrl String?

  ficheUploaded      Boolean  @default(false)
  ficheUrl           String?

  recepisseUploaded  Boolean  @default(false)
  recepisseUrl       String?

  montant            Int      @default(50000)
  montantSupplement  Int?                  // multi-spécialités, staff-editable, may stay empty
  paye               Int      @default(0)
  moyen              String   @default("Non renseigné")

  motifRejet         String?

  stageChangedAt     DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  comments           DossierComment[]

  @@index([stage])
  @@index([whatsapp])
}

model DossierComment {
  id         String   @id @default(cuid())
  dossierId  String
  dossier    Dossier  @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  type       String   // "public" | "internal"
  text       String
  authorName String   // admin's email/display, from requireAdmin's session
  createdAt  DateTime @default(now())

  @@index([dossierId])
}
```

No relation to `User` — dossiers are candidate-anonymous by design (§3). `specialtyCodes` is a
plain string array rather than a relational join, matching that specialty *administration*
(editing dates/salles/WhatsApp links) stays out of scope (Spécialités & WhatsApp is still
static). `authFormData` is a JSON blob rather than a normalized sub-model — it's never queried
independently, only displayed; normalizing it would be YAGNI.

`authSubmittedAt` on its own (no separate boolean) doubles as both the `authSubmitted` flag
(`!= null`) and the timestamp the "activité récente" feed needs (§10).

## 5. Reference number generation

Format: `EB-MMYYYY-NNN` (month + year, zero-padded 3-digit sequence, e.g. `EB-092026-001`) —
changed from the originally-approved `EB-YYYYMM-NNN` per a later user request, after Task 19
had already shipped; only `frontend/src/lib/server/dossiers/reference.ts` needed to change
(commit `387b877`), since every consumer treats the reference as an opaque string.
Resetting the counter every calendar month. Generated inside the same transaction as the
`Dossier` insert to avoid races: count existing dossiers for the current `YYYYMM` prefix,
increment, retry once on a unique-constraint collision (two near-simultaneous submissions).

## 6. Public upload path

`/api/upload` (existing) calls `requireAuth()` — incompatible with anonymous candidates, and
not to be modified (it's used by the authenticated-user upload flow elsewhere in the starter).

New internal helper `frontend/src/lib/server/upload/uploadPublicFile.ts` wraps the existing
`sniff.ts` magic-byte validation + Cloudinary client (both already shared, reusable without
duplicating logic), callable directly from the new public route handlers below — no separate
HTTP hop, no auth check. Same `UPLOAD_ALLOWED_MIME` / `UPLOAD_MAX_BYTES` constraints as the
authenticated path.

## 7. API surface

All mutating routes: `export const runtime = 'nodejs'`, CSRF is N/A for the public routes
(no session cookie exists to forge against) but IS required on admin routes exactly like every
other `/api/admin/*` route today.

**Public:**
- `POST /api/dossiers` — multipart: `specialtyCodes[]`, `nom`, `prenom`, `whatsapp`, `pdf`,
  4 consent booleans (validated server-side same rules as the Accompagnement form already
  enforces client-side). Creates the Dossier (montant = 50000, `montantSupplement` left null),
  uploads the PDF, returns `{ reference }`.
- `GET /api/dossiers/lookup?reference=&whatsapp=` — exact match on both; generic "not found"
  on any mismatch (no hint which field is wrong, same enumeration-resistance spirit as
  `/api/auth/*`). Returns the public-safe subset of fields the Suivi screen renders (stage,
  timeline-relevant flags, no `motifRejet` unless stage 0, no internal comments).
- `POST /api/dossiers/lookup/fiche` — body includes `reference` + `whatsapp` (same pair as
  above, re-validated) + the file; sets `ficheUploaded`/`ficheUrl`. Only accepted while
  `stage === 3`.
- `GET /api/dossiers/auth-form/[token]` — validates the token: exists, not expired
  (`authTokenExpiresAt`), dossier still at `stage === 2`, not already submitted
  (`authSubmittedAt == null`). Returns `{ reference }` on success or a typed reason
  (`invalid`, `expired`, `already-submitted`, `wrong-stage`) the page uses to pick its message.
- `POST /api/dossiers/auth-form/[token]` — re-validates the token identically, then the full
  `authFormData` shape + 2 PDFs (named `diplôme-{nom}-{prénom}-bac.pdf` /
  `-doctorat.pdf`, matching the back-office preview's existing naming convention), sets
  `authSubmittedAt = now()`, clears nothing else.

**Admin (`requireAdmin('ADMIN')`, matching the existing back-office pattern):**
- `GET /api/admin/dossiers?stage=` — list + per-stage counts in one response (mirrors
  `DOSSIER_FILTERS` counts already rendered).
- `GET /api/admin/dossiers/[id]` — full detail for the modal.
- `PATCH /api/admin/dossiers/[id]` — payment fields only (`montant`, `montantSupplement`,
  `paye` clamped `[0, montant+montantSupplement]` server-side same as the client already does,
  `moyen`).
- `POST /api/admin/dossiers/[id]/auth-send` — generates `authToken` (32 bytes,
  base64url), sets `authTokenExpiresAt = now()+30d`, `authSentAt = now()`. Returns the token so
  the client can build the `wa.me` link (message text assembled client-side, same pattern as
  today's UI copy).
- `POST /api/admin/dossiers/[id]/reject` — body `{ motif }`, sets `stage=0`,
  `motifRejet=motif`, `stageChangedAt=now()`.
- `POST /api/admin/dossiers/[id]/restore` — `stage=1`, `stageChangedAt=now()`. Only from
  `stage===0`.
- `POST /api/admin/dossiers/[id]/advance` — `stage=min(stage+1,5)`, `stageChangedAt=now()`.
  Only from `1<=stage<=4`.
- `POST /api/admin/dossiers/[id]/recepisse` — multipart upload, sets `recepisseUploaded`/`Url`.
  Only from `stage===4` or (`stage===5` and not yet uploaded).
- `POST /api/admin/dossiers/[id]/comments` — `{ type, text }`, `authorName` from the admin
  session.
- `GET /api/admin/dossiers/summary` — KPI counts by stage, the "en attente >5 jours" list
  (stage 1-4, `stageChangedAt` older than 5 days, oldest first), and the last N "activité
  récente" entries merged from `createdAt`/`authSubmittedAt`/`stageChangedAt` across recent
  dossiers (labelled "Nouveau dossier reçu" / "Formulaire d'authentification reçu" / "Statut
  modifié" respectively — no separate event-log table, derived at query time).

Every admin mutation calls `logAdminAction(prisma, {...})` per the existing invariant.

## 8. `/authentification-diplome/[token]` screen

Public, no nav chrome beyond the bare logo header (matches screenshots 58/59 — this is not a
page inside the public site's nav/footer shell). Same visual system as Accompagnement:
`.page-head`-style eyebrow/H1/lead, a read-only "N° de dossier" box (surface-2 background, 🔒
"pré-rempli, non modifiable"), one card containing three `.section-lbl`-headed groups
(Informations personnelles / Diplôme du Baccalauréat / Diplôme du Doctorat) with `.row2` field
pairs collapsing to one column on mobile, a `.callout.warn`-style "⛔ TRÈS IMPORTANT" block, and
a full-width primary submit button. Institution placeholder text: "Office du Baccalauréat du
Bénin" for the Bac section specifically (per the client's example), generic "Nom de
l'institution" for Doctorat (matches screenshots exactly).

Four states, driven by the `GET` call above: valid-unfilled (show the form), invalid/expired,
already-submitted, and — after a successful `POST` — a confirmation screen (no external
redirect) repeating the same e-mail-notice warning.

## 9. Envoi WhatsApp (deep link, not an API)

Clicking "Envoyer le formulaire d'authentification" in the modal calls the `auth-send` route,
then opens `https://wa.me/<digits-only-whatsapp>?text=<url-encoded message>` in a new tab. The
digits-only transform strips everything but digits from `dossier.wa` (the stored
`+229 XX XX XX XX` format). Message text includes the dossier reference and the
`${NEXT_PUBLIC_APP_URL}/authentification-diplome/${token}` link — copy drafted to match the
app's existing tone, finalized during implementation.

## 10. Tableau de bord wiring

`admin/tableau-de-bord/page.tsx` becomes a server component fetching
`/api/admin/dossiers/summary` (or the equivalent direct Prisma call, since it already runs
inside the `requireAdmin`-gated `/admin` layout) for `#kpiBlockGeneral`, the "en attente"
panel, and "activité récente". `#kpiBlockFinance` and the chart/payment-breakdown panels keep
their current hardcoded values — untouched.

## 11. Rate limiting

All new public routes (`POST /api/dossiers`, the lookup routes, both `auth-form/[token]`
routes) sit behind the existing general IP-based limiter already applied app-wide
(`rate-limit-store.ts`) — no new per-email limiter is needed since there's no email/identity
concept to key on here, but this is called out explicitly so it isn't silently skipped: these
are the first *unauthenticated, file-accepting* POST routes in the app, and abuse resistance
matters more here than on the existing authenticated upload path.

## 12. Error handling

- Public routes: generic, non-enumerating error messages (same posture as `/api/auth/*`).
- Token routes: the 4 distinct states in §8 are surfaced as distinct UI messages but the API
  itself doesn't leak *why* beyond the typed reason (no dossier data returned on failure).
- File validation: same magic-byte sniffing + size/MIME constraints as the existing upload
  path, surfaced as the same `INVALID_FILE_CONTENT` error code the frontend `ApiError.code`
  convention already expects.
- Stage-transition routes reject out-of-range transitions server-side even though the UI
  already disables the buttons client-side (never trust client-only gating).

## 13. Testing

Unit tests per new route (Vitest, mocked Prisma, matching the existing `route.test.ts`
pattern used throughout `frontend/src/app/api/**`). Particular attention to: reference
generation uniqueness under a simulated collision, token validation's 4 branches, payment
clamping, and the stage-transition guards (reject/restore/advance boundary conditions already
enumerated in DESIGN-SPEC.md §10).

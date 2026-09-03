-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "specialtyCodes" TEXT[],
    "stage" INTEGER NOT NULL DEFAULT 1,
    "pieceJointeUrl" TEXT,
    "authToken" TEXT,
    "authTokenExpiresAt" TIMESTAMP(3),
    "authSentAt" TIMESTAMP(3),
    "authSubmittedAt" TIMESTAMP(3),
    "authFormData" JSONB,
    "diplomaBacUrl" TEXT,
    "diplomaDoctoratUrl" TEXT,
    "ficheUploaded" BOOLEAN NOT NULL DEFAULT false,
    "ficheUrl" TEXT,
    "recepisseUploaded" BOOLEAN NOT NULL DEFAULT false,
    "recepisseUrl" TEXT,
    "montant" INTEGER NOT NULL DEFAULT 50000,
    "montantSupplement" INTEGER,
    "paye" INTEGER NOT NULL DEFAULT 0,
    "moyen" TEXT NOT NULL DEFAULT 'Non renseigné',
    "motifRejet" TEXT,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierComment" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossierComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_reference_key" ON "Dossier"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_authToken_key" ON "Dossier"("authToken");

-- CreateIndex
CREATE INDEX "Dossier_stage_idx" ON "Dossier"("stage");

-- CreateIndex
CREATE INDEX "Dossier_whatsapp_idx" ON "Dossier"("whatsapp");

-- CreateIndex
CREATE INDEX "DossierComment_dossierId_idx" ON "DossierComment"("dossierId");

-- AddForeignKey
ALTER TABLE "DossierComment" ADD CONSTRAINT "DossierComment_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

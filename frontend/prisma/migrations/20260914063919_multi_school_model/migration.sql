-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "categorieId" TEXT,
ADD COLUMN     "ecoleId" TEXT,
ADD COLUMN     "filiereId" TEXT;

-- CreateTable
CREATE TABLE "Ecole" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "lienWhatsappGeneral" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "ecoleId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "typeAdmission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filiere" (
    "id" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "date" TEXT,
    "heure" TEXT,
    "salle" TEXT,
    "lienWhatsapp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "recherche" TEXT NOT NULL,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Categorie_ecoleId_idx" ON "Categorie"("ecoleId");

-- CreateIndex
CREATE INDEX "Filiere_categorieId_idx" ON "Filiere"("categorieId");

-- CreateIndex
CREATE INDEX "Filiere_code_idx" ON "Filiere"("code");

-- CreateIndex
CREATE INDEX "Suggestion_statut_createdAt_idx" ON "Suggestion"("statut", "createdAt");

-- CreateIndex
CREATE INDEX "Dossier_ecoleId_idx" ON "Dossier"("ecoleId");

-- CreateIndex
CREATE INDEX "Dossier_categorieId_idx" ON "Dossier"("categorieId");

-- CreateIndex
CREATE INDEX "Dossier_filiereId_idx" ON "Dossier"("filiereId");

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filiere" ADD CONSTRAINT "Filiere_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


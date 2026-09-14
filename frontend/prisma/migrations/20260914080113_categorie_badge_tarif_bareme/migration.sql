-- AlterTable
ALTER TABLE "Categorie" ADD COLUMN     "libelleCourt" TEXT;

-- CreateTable
CREATE TABLE "TarifBareme" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "montants" JSONB,
    "montantUnique" INTEGER,
    "regleSpecialitesAdditionnelles" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarifBareme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TarifBareme_effectiveFrom_idx" ON "TarifBareme"("effectiveFrom");

-- AddForeignKey
ALTER TABLE "TarifBareme" ADD CONSTRAINT "TarifBareme_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Dossier" DROP COLUMN "diplomaUrl",
ADD COLUMN     "correctionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "correctionToken" TEXT,
ADD COLUMN     "correctionTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "diplomaBacTranslatedUrl" TEXT,
ADD COLUMN     "diplomaBacUrl" TEXT,
ADD COLUMN     "diplomaDoctoratTranslatedUrl" TEXT,
ADD COLUMN     "diplomaDoctoratUrl" TEXT,
ADD COLUMN     "nationalite" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_correctionToken_key" ON "Dossier"("correctionToken");


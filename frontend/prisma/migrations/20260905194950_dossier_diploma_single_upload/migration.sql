/*
  Warnings:

  - You are about to drop the column `diplomaBacUrl` on the `Dossier` table. All the data in the column will be lost.
  - You are about to drop the column `diplomaDoctoratUrl` on the `Dossier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dossier" DROP COLUMN "diplomaBacUrl",
DROP COLUMN "diplomaDoctoratUrl",
ADD COLUMN     "diplomaUrl" TEXT;

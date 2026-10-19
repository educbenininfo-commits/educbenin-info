-- AlterTable
ALTER TABLE "Categorie" ADD COLUMN     "supplementSpecialite" INTEGER;

-- AlterTable
ALTER TABLE "TarifBareme" ADD COLUMN     "supplementSpecialite" INTEGER;

-- Initial value: + 25 000 FCFA per D.E.S. specialty beyond the first
-- (editable afterwards from the back-office Tarifs screen).
UPDATE "Categorie" SET "supplementSpecialite" = 25000 WHERE "id" = 'cat-fss-des';

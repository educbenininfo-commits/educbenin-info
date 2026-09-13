-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminLabel" TEXT,
ADD COLUMN     "modulePermissions" JSONB;

-- CreateTable
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "adminLabel" TEXT,
    "modulePermissions" JSONB,
    "invitedByUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvite_token_key" ON "AdminInvite"("token");

-- CreateIndex
CREATE INDEX "AdminInvite_email_idx" ON "AdminInvite"("email");

-- CreateIndex
CREATE INDEX "AdminInvite_token_idx" ON "AdminInvite"("token");

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


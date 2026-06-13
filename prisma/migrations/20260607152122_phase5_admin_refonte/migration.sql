/*
  Warnings:

  - You are about to drop the column `prefix` on the `ApiKey` table. All the data in the column will be lost.
  - The `scopes` column on the `ApiKey` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `entityType` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `newValues` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `oldValues` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AppSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AutomationRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Integration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemList` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `keyPrefix` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entity` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Made the column `color` on table `Tag` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'ADMINISTRATEUR';
ALTER TYPE "Role" ADD VALUE 'SUPERVISEUR';
ALTER TYPE "Role" ADD VALUE 'COORDINATEUR';

-- DropIndex
DROP INDEX "AuditLog_entityId_idx";

-- DropIndex
DROP INDEX "AuditLog_entityType_idx";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "prefix",
ADD COLUMN     "keyPrefix" TEXT NOT NULL,
DROP COLUMN "scopes",
ADD COLUMN     "scopes" TEXT[];

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "entityType",
DROP COLUMN "newValues",
DROP COLUMN "oldValues",
ADD COLUMN     "entity" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "showInSidebar" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "color" SET NOT NULL,
ALTER COLUMN "color" SET DEFAULT '#6366f1';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "invitedAt" TIMESTAMP(3),
ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- DropTable
DROP TABLE "AppSetting";

-- DropTable
DROP TABLE "AutomationRule";

-- DropTable
DROP TABLE "Integration";

-- DropTable
DROP TABLE "ModuleSetting";

-- DropTable
DROP TABLE "SystemList";

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'WEB',
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportLevel" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT NOT NULL,
    "lastCalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'Bureau Parlementaire',
    "logoUrl" TEXT,
    "force2FA" BOOLEAN NOT NULL DEFAULT false,
    "ipAllowlist" TEXT,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 1440,
    "mobileAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_jti_key" ON "UserSession"("jti");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_jti_idx" ON "UserSession"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

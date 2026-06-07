-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('COMMERCE', 'ASSOCIATION', 'MAIRIE', 'MEDIA', 'INSTITUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PermanenceStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'TO_CORRECT', 'READY', 'VALIDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'IMPOSSIBLE');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('NOT_CALLED', 'REACHED', 'ABSENT', 'VOICEMAIL', 'APPOINTMENT_CONFIRMED', 'CALLBACK_REQUESTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('PHONING', 'ELU', 'INSTITUTIONNEL', 'PRESSE', 'COMMERCANT', 'CITOYEN');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL DEFAULT 'OTHER',
    "sector" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commune" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "inseeCode" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilePermanence" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PermanenceStatus" NOT NULL DEFAULT 'DRAFT',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scheduledStartDate" TIMESTAMP(3) NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "validationUserId" TEXT,
    "validationComment" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MobilePermanence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanenceLocation" (
    "id" TEXT NOT NULL,
    "permanenceId" TEXT NOT NULL,
    "communeId" TEXT,
    "communeName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "address" TEXT,
    "parkingNotes" TEXT,
    "parkingStatus" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "mairieContactId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanenceTask" (
    "id" TEXT NOT NULL,
    "permanenceId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assigneeUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "required" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanenceContact" (
    "id" TEXT NOT NULL,
    "permanenceId" TEXT NOT NULL,
    "contactId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "role" "ContactRole" NOT NULL DEFAULT 'PHONING',
    "callStatus" "CallStatus" NOT NULL DEFAULT 'NOT_CALLED',
    "requestSummary" TEXT,
    "requiresDeputyAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanenceOrganization" (
    "id" TEXT NOT NULL,
    "permanenceId" TEXT NOT NULL,
    "organizationId" TEXT,
    "orgName" TEXT,
    "type" "OrgType" NOT NULL DEFAULT 'COMMERCE',
    "sector" TEXT,
    "attitude" TEXT,
    "concern" TEXT,
    "visitRecommended" BOOLEAN NOT NULL DEFAULT false,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanenceSynthesis" (
    "id" TEXT NOT NULL,
    "permanenceId" TEXT NOT NULL,
    "attentionPoints" TEXT,
    "merchantProgram" TEXT,
    "phoningTopics" TEXT,
    "recommendations" TEXT,
    "signedByUserId" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermanenceSynthesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commune_inseeCode_key" ON "Commune"("inseeCode");

-- CreateIndex
CREATE UNIQUE INDEX "PermanenceSynthesis_permanenceId_key" ON "PermanenceSynthesis"("permanenceId");

-- AddForeignKey
ALTER TABLE "MobilePermanence" ADD CONSTRAINT "MobilePermanence_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilePermanence" ADD CONSTRAINT "MobilePermanence_validationUserId_fkey" FOREIGN KEY ("validationUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceLocation" ADD CONSTRAINT "PermanenceLocation_permanenceId_fkey" FOREIGN KEY ("permanenceId") REFERENCES "MobilePermanence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceLocation" ADD CONSTRAINT "PermanenceLocation_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceTask" ADD CONSTRAINT "PermanenceTask_permanenceId_fkey" FOREIGN KEY ("permanenceId") REFERENCES "MobilePermanence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceTask" ADD CONSTRAINT "PermanenceTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceContact" ADD CONSTRAINT "PermanenceContact_permanenceId_fkey" FOREIGN KEY ("permanenceId") REFERENCES "MobilePermanence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceContact" ADD CONSTRAINT "PermanenceContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceOrganization" ADD CONSTRAINT "PermanenceOrganization_permanenceId_fkey" FOREIGN KEY ("permanenceId") REFERENCES "MobilePermanence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceOrganization" ADD CONSTRAINT "PermanenceOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceSynthesis" ADD CONSTRAINT "PermanenceSynthesis_permanenceId_fkey" FOREIGN KEY ("permanenceId") REFERENCES "MobilePermanence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanenceSynthesis" ADD CONSTRAINT "PermanenceSynthesis_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

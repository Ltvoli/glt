CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "buildingType" TEXT,
ADD COLUMN     "door" TEXT,
ADD COLUMN     "floor" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "profession" TEXT;

-- AlterTable
ALTER TABLE "EmployeeSetting" ADD COLUMN     "showInPlanning" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "MailCase" ADD COLUMN     "validationStatus" TEXT;

-- AlterTable
ALTER TABLE "MobilePermanence" ADD COLUMN     "returnDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "bg" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "WrittenQuestion" ALTER COLUMN "status" SET DEFAULT 'A_REDIGER';

-- CreateTable
CREATE TABLE "FieldConfig" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "section" TEXT,
    "fieldKey" TEXT NOT NULL,
    "defaultLabel" TEXT NOT NULL,
    "customLabel" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'ERROR',
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkCommunication" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "BulkCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContactToContactList" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactToContactList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldConfig_module_fieldKey_key" ON "FieldConfig"("module", "fieldKey");

-- CreateIndex
CREATE INDEX "AppLog_level_idx" ON "AppLog"("level");

-- CreateIndex
CREATE INDEX "AppLog_createdAt_idx" ON "AppLog"("createdAt");

-- CreateIndex
CREATE INDEX "AppLog_source_idx" ON "AppLog"("source");

-- CreateIndex
CREATE UNIQUE INDEX "ContactList_name_key" ON "ContactList"("name");

-- CreateIndex
CREATE INDEX "_ContactToContactList_B_index" ON "_ContactToContactList"("B");

-- CreateIndex
CREATE INDEX "Contact_firstName_trgm_idx" ON "Contact" USING GIN ("firstName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Contact_lastName_trgm_idx" ON "Contact" USING GIN ("lastName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Contact_email_trgm_idx" ON "Contact" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Contact_city_trgm_idx" ON "Contact" USING GIN ("city" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "BulkCommunication" ADD CONSTRAINT "BulkCommunication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToContactList" ADD CONSTRAINT "_ContactToContactList_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToContactList" ADD CONSTRAINT "_ContactToContactList_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

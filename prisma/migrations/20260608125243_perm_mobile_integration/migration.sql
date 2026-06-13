-- AlterTable
ALTER TABLE "MobilePermanence" ADD COLUMN     "deputyRemarks" TEXT;

-- AlterTable
ALTER TABLE "PermanenceLocation" ADD COLUMN     "locationNotes" TEXT;

-- AlterTable
ALTER TABLE "PermanenceSynthesis" ADD COLUMN     "merchantInsights" TEXT;

-- AddForeignKey
ALTER TABLE "PermanenceLocation" ADD CONSTRAINT "PermanenceLocation_mairieContactId_fkey" FOREIGN KEY ("mairieContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

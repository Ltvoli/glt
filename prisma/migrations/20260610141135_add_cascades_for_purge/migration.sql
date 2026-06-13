-- DropForeignKey
ALTER TABLE "DuplicateCandidate" DROP CONSTRAINT "DuplicateCandidate_contact1Id_fkey";

-- DropForeignKey
ALTER TABLE "DuplicateCandidate" DROP CONSTRAINT "DuplicateCandidate_contact2Id_fkey";

-- DropForeignKey
ALTER TABLE "GlobalLink" DROP CONSTRAINT "GlobalLink_contactId_fkey";

-- DropForeignKey
ALTER TABLE "GlobalLink" DROP CONSTRAINT "GlobalLink_mailCaseId_fkey";

-- DropForeignKey
ALTER TABLE "GlobalLink" DROP CONSTRAINT "GlobalLink_questionId_fkey";

-- DropForeignKey
ALTER TABLE "GlobalLink" DROP CONSTRAINT "GlobalLink_taskId_fkey";

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_mailCaseId_fkey" FOREIGN KEY ("mailCaseId") REFERENCES "MailCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WrittenQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_contact1Id_fkey" FOREIGN KEY ("contact1Id") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_contact2Id_fkey" FOREIGN KEY ("contact2Id") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

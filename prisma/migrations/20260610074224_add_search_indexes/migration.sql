-- CreateIndex
CREATE INDEX "MailCase_subject_idx" ON "MailCase"("subject");

-- CreateIndex
CREATE INDEX "MailCase_senderName_idx" ON "MailCase"("senderName");

-- CreateIndex
CREATE INDEX "MailCase_recipientName_idx" ON "MailCase"("recipientName");

-- CreateIndex
CREATE INDEX "Task_title_idx" ON "Task"("title");

-- CreateIndex
CREATE INDEX "WrittenQuestion_title_idx" ON "WrittenQuestion"("title");

-- CreateIndex
CREATE INDEX "WrittenQuestion_ministry_idx" ON "WrittenQuestion"("ministry");

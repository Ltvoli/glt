-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "mobilePhone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "streetNumber" TEXT,
    "streetName" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "address" TEXT,
    "territorySector" TEXT,
    "supportLevel" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "whatsappStatus" TEXT,
    "linkedinUrl" TEXT,
    "notes" TEXT,
    "lastInteraction" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactTag" (
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ContactTag_pkey" PRIMARY KEY ("contactId","tagId")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "status" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "dueDate" TIMESTAMP(3),
    "expectedDeliverable" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailCase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ENTRANT',
    "receiveDate" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "senderName" TEXT,
    "city" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'NORMALE',
    "status" TEXT NOT NULL DEFAULT 'RECU',
    "content" TEXT,
    "notes" TEXT,
    "responseDueDate" TIMESTAMP(3),
    "responseSentDate" TIMESTAMP(3),
    "parentMailCaseId" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrittenQuestion" (
    "id" TEXT NOT NULL,
    "anNumber" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ministry" TEXT,
    "theme" TEXT,
    "depositDate" TIMESTAMP(3),
    "responseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DEPOSEE',
    "concernedPerson" TEXT,
    "feedbackNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpDescription" TEXT,
    "followUpDueDate" TIMESTAMP(3),
    "content" TEXT,
    "responseContent" TEXT,
    "notes" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WrittenQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeStatus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "dayType" TEXT NOT NULL DEFAULT 'worked',
    "notes" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "EmployeeStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "annualWorkingDays" INTEGER NOT NULL DEFAULT 218,
    "referencePeriodStartMonth" INTEGER NOT NULL DEFAULT 6,
    "referencePeriodStartDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalLink" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "taskId" TEXT,
    "mailCaseId" TEXT,
    "questionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "importDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "rowsImported" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCandidate" (
    "id" TEXT NOT NULL,
    "contact1Id" TEXT NOT NULL,
    "contact2Id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "taskId" TEXT,
    "mailCaseId" TEXT,
    "questionId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MailCase_reference_key" ON "MailCase"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeStatus_employeeId_date_key" ON "EmployeeStatus"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSetting_userId_key" ON "EmployeeSetting"("userId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTag" ADD CONSTRAINT "ContactTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailCase" ADD CONSTRAINT "MailCase_parentMailCaseId_fkey" FOREIGN KEY ("parentMailCaseId") REFERENCES "MailCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailCase" ADD CONSTRAINT "MailCase_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrittenQuestion" ADD CONSTRAINT "WrittenQuestion_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrittenQuestion" ADD CONSTRAINT "WrittenQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatus" ADD CONSTRAINT "EmployeeStatus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSetting" ADD CONSTRAINT "EmployeeSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_mailCaseId_fkey" FOREIGN KEY ("mailCaseId") REFERENCES "MailCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalLink" ADD CONSTRAINT "GlobalLink_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WrittenQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_contact1Id_fkey" FOREIGN KEY ("contact1Id") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCandidate" ADD CONSTRAINT "DuplicateCandidate_contact2Id_fkey" FOREIGN KEY ("contact2Id") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_mailCaseId_fkey" FOREIGN KEY ("mailCaseId") REFERENCES "MailCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "WrittenQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

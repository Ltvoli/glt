-- CreateTable
CREATE TABLE "AppDictionary" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppDictionary_type_idx" ON "AppDictionary"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AppDictionary_type_code_key" ON "AppDictionary"("type", "code");

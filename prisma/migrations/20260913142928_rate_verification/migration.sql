-- CreateTable
CREATE TABLE "RateCheck" (
    "id" TEXT NOT NULL,
    "rateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "lawTitle" TEXT NOT NULL,
    "lawRedaction" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "note" TEXT,
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "RateCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCheckEvent" (
    "id" TEXT NOT NULL,
    "rateCheckId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCheckEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RateCheck_rateKey_key" ON "RateCheck"("rateKey");

-- CreateIndex
CREATE INDEX "RateCheckEvent_rateCheckId_createdAt_idx" ON "RateCheckEvent"("rateCheckId", "createdAt");

-- AddForeignKey
ALTER TABLE "RateCheckEvent" ADD CONSTRAINT "RateCheckEvent_rateCheckId_fkey" FOREIGN KEY ("rateCheckId") REFERENCES "RateCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

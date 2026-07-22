-- CreateEnum
CREATE TYPE "IfoodEventProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "IfoodConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pollLockedAt" TIMESTAMP(3),
    "pollLockedBy" TEXT,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfoodConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IfoodEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "code" TEXT,
    "fullCode" TEXT,
    "externalOrderId" TEXT,
    "merchantId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "processingStatus" "IfoodEventProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "IfoodEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IfoodOrder" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "displayId" TEXT,
    "lastEventFullCode" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "snapshot" JSONB,
    "snapshotFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfoodOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IfoodConnection_merchantId_key" ON "IfoodConnection"("merchantId");

-- CreateIndex
CREATE INDEX "IfoodConnection_storeId_isActive_idx" ON "IfoodConnection"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IfoodConnection_storeId_merchantId_key" ON "IfoodConnection"("storeId", "merchantId");

-- CreateIndex
CREATE INDEX "IfoodEvent_connectionId_receivedAt_idx" ON "IfoodEvent"("connectionId", "receivedAt");

-- CreateIndex
CREATE INDEX "IfoodEvent_storeId_receivedAt_idx" ON "IfoodEvent"("storeId", "receivedAt");

-- CreateIndex
CREATE INDEX "IfoodEvent_externalOrderId_idx" ON "IfoodEvent"("externalOrderId");

-- CreateIndex
CREATE INDEX "IfoodEvent_processingStatus_idx" ON "IfoodEvent"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "IfoodEvent_connectionId_externalEventId_key" ON "IfoodEvent"("connectionId", "externalEventId");

-- CreateIndex
CREATE INDEX "IfoodOrder_storeId_updatedAt_idx" ON "IfoodOrder"("storeId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IfoodOrder_connectionId_externalOrderId_key" ON "IfoodOrder"("connectionId", "externalOrderId");

-- AddForeignKey
ALTER TABLE "IfoodConnection" ADD CONSTRAINT "IfoodConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IfoodEvent" ADD CONSTRAINT "IfoodEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IfoodConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IfoodEvent" ADD CONSTRAINT "IfoodEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IfoodOrder" ADD CONSTRAINT "IfoodOrder_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IfoodConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IfoodOrder" ADD CONSTRAINT "IfoodOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

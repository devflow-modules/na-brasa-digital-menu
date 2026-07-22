-- CreateEnum
CREATE TYPE "IfoodOrderCommandType" AS ENUM ('CONFIRM', 'START_PREPARATION', 'READY_TO_PICKUP', 'DISPATCH');

-- CreateEnum
CREATE TYPE "IfoodOrderCommandStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "IfoodOrderCommandAttemptStatus" AS ENUM ('STARTED', 'ACCEPTED', 'FAILED');

-- CreateTable
CREATE TABLE "IfoodOrderCommand" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ifoodOrderId" TEXT NOT NULL,
    "type" "IfoodOrderCommandType" NOT NULL,
    "status" "IfoodOrderCommandStatus" NOT NULL DEFAULT 'PENDING',
    "correlationKey" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedByExternalEventId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IfoodOrderCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IfoodOrderCommandAttempt" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "status" "IfoodOrderCommandAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "httpStatus" INTEGER,
    "sanitizedError" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "IfoodOrderCommandAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IfoodOrderCommand_correlationKey_key" ON "IfoodOrderCommand"("correlationKey");
CREATE UNIQUE INDEX "IfoodOrderCommand_ifoodOrderId_type_key" ON "IfoodOrderCommand"("ifoodOrderId", "type");
CREATE INDEX "IfoodOrderCommand_connectionId_status_idx" ON "IfoodOrderCommand"("connectionId", "status");
CREATE INDEX "IfoodOrderCommand_storeId_createdAt_idx" ON "IfoodOrderCommand"("storeId", "createdAt");
CREATE INDEX "IfoodOrderCommandAttempt_commandId_startedAt_idx" ON "IfoodOrderCommandAttempt"("commandId", "startedAt");

-- AddForeignKey
ALTER TABLE "IfoodOrderCommand" ADD CONSTRAINT "IfoodOrderCommand_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IfoodConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IfoodOrderCommand" ADD CONSTRAINT "IfoodOrderCommand_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IfoodOrderCommand" ADD CONSTRAINT "IfoodOrderCommand_ifoodOrderId_fkey" FOREIGN KEY ("ifoodOrderId") REFERENCES "IfoodOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IfoodOrderCommandAttempt" ADD CONSTRAINT "IfoodOrderCommandAttempt_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "IfoodOrderCommand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

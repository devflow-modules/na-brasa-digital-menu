-- CreateEnum
CREATE TYPE "FunnelEventName" AS ENUM (
  'menu_viewed',
  'product_added',
  'checkout_started',
  'order_created',
  'whatsapp_handoff_started',
  'order_confirmed',
  'order_completed',
  'order_cancelled'
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" "FunnelEventName" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "clientOccurredAt" TIMESTAMP(3),
    "sessionId" TEXT,
    "orderId" TEXT,
    "productId" TEXT,
    "source" "OrderSource",
    "quantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FunnelEvent_storeId_dedupeKey_key" ON "FunnelEvent"("storeId", "dedupeKey");

-- CreateIndex
CREATE INDEX "FunnelEvent_storeId_name_occurredAt_idx" ON "FunnelEvent"("storeId", "name", "occurredAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_storeId_occurredAt_idx" ON "FunnelEvent"("storeId", "occurredAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_orderId_idx" ON "FunnelEvent"("orderId");

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

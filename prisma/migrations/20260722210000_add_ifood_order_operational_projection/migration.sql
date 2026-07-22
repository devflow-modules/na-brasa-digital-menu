-- AlterTable
ALTER TABLE "IfoodOrder" ADD COLUMN "operationalOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IfoodOrder_operationalOrderId_key" ON "IfoodOrder"("operationalOrderId");

-- AddForeignKey
ALTER TABLE "IfoodOrder" ADD CONSTRAINT "IfoodOrder_operationalOrderId_fkey" FOREIGN KEY ("operationalOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

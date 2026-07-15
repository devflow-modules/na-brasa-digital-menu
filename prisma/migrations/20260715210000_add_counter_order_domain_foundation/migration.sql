-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'COUNTER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ALTER COLUMN "customerPhone" DROP NOT NULL,
ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

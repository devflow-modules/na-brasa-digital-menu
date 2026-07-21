-- AlterEnum
-- Keep legacy CARD for historical completed orders without card-type evidence.
ALTER TYPE "PaymentMethod" ADD VALUE 'DEBIT_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD';

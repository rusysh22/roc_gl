-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "bounced_at" TIMESTAMP(3),
ADD COLUMN     "bounced_reason" TEXT;

-- CreateTable
CREATE TABLE "bank_reconciliation_items" (
    "id" TEXT NOT NULL,
    "reconciliation_id" TEXT NOT NULL,
    "bank_transaction_id" TEXT,
    "journal_line_id" TEXT,
    "matchType" VARCHAR(20) NOT NULL,
    "confidenceScore" DECIMAL(5,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'MATCHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_reconciliation_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bank_reconciliation_items" ADD CONSTRAINT "bank_reconciliation_items_reconciliation_id_fkey" FOREIGN KEY ("reconciliation_id") REFERENCES "bank_reconciliations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

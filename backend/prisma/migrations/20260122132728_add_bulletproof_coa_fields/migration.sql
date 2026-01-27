-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "allow_direct_post" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_control" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_payment_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtype" TEXT,
ADD COLUMN     "system_tag" TEXT;

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "account_number" TEXT,
    "opening_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reconcile_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_accounts_tenant_id_idx" ON "payment_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_accounts_status_idx" ON "payment_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_accounts_tenant_id_account_id_key" ON "payment_accounts"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "accounts_system_tag_idx" ON "accounts"("system_tag");

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

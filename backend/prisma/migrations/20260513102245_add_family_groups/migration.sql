-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('CHAMA', 'SAVINGS', 'INVESTMENT', 'WELFARE');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('ADMIN', 'TREASURER', 'MEMBER');

-- CreateEnum
CREATE TYPE "GroupContributionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'MISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_traffic_days" (
    "id" SERIAL NOT NULL,
    "day" DATE NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,
    "bounce_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_session_seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_traffic_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_referrer_days" (
    "id" SERIAL NOT NULL,
    "day" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_referrer_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_device_shares" (
    "id" SERIAL NOT NULL,
    "range_days" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_device_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saved" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "type" "GroupType" NOT NULL DEFAULT 'CHAMA',
    "color" TEXT DEFAULT '#1a3a8f',
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" TEXT,
    "contribution_amount" DECIMAL(65,30),
    "treasurer_name" TEXT,
    "treasurer_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_contributions" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT DEFAULT 'M-PESA',
    "status" "GroupContributionStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_traffic_days_day_idx" ON "platform_traffic_days"("day");

-- CreateIndex
CREATE UNIQUE INDEX "platform_traffic_days_day_key" ON "platform_traffic_days"("day");

-- CreateIndex
CREATE INDEX "platform_referrer_days_day_idx" ON "platform_referrer_days"("day");

-- CreateIndex
CREATE INDEX "platform_referrer_days_day_name_idx" ON "platform_referrer_days"("day", "name");

-- CreateIndex
CREATE INDEX "platform_device_shares_range_days_snapshot_at_idx" ON "platform_device_shares"("range_days", "snapshot_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_device_shares_range_days_name_key" ON "platform_device_shares"("range_days", "name");

-- CreateIndex
CREATE INDEX "groups_tenant_id_idx" ON "groups"("tenant_id");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "group_contributions_group_id_idx" ON "group_contributions"("group_id");

-- CreateIndex
CREATE INDEX "group_contributions_user_id_idx" ON "group_contributions"("user_id");

-- CreateIndex
CREATE INDEX "users_last_seen_at_idx" ON "users"("last_seen_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_contributions" ADD CONSTRAINT "group_contributions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_contributions" ADD CONSTRAINT "group_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

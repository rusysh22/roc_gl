-- CreateTable
CREATE TABLE "coa_groups" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "name_en" VARCHAR(200),
    "account_type" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coa_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "coa_group_id" TEXT NOT NULL,
    "parent_coa_id" TEXT,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "name_en" VARCHAR(200),
    "account_type" VARCHAR(20) NOT NULL,
    "account_sub_type" VARCHAR(50),
    "normal_balance" VARCHAR(10) NOT NULL,
    "cash_flow_category" VARCHAR(20),
    "tax_mapping_code" VARCHAR(50),
    "psak_tag" VARCHAR(50),
    "is_budget_applicable" BOOLEAN NOT NULL DEFAULT false,
    "is_intercompany" BOOLEAN NOT NULL DEFAULT false,
    "is_header" BOOLEAN NOT NULL DEFAULT false,
    "is_retained_earnings" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coa_groups_company_id_code_key" ON "coa_groups"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_company_id_code_key" ON "chart_of_accounts"("company_id", "code");

-- AddForeignKey
ALTER TABLE "coa_groups" ADD CONSTRAINT "coa_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_coa_group_id_fkey" FOREIGN KEY ("coa_group_id") REFERENCES "coa_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_coa_id_fkey" FOREIGN KEY ("parent_coa_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

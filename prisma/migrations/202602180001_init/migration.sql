-- CreateEnum
CREATE TYPE "TerritoryType" AS ENUM ('REGIAO', 'UF', 'MUNICIPIO');

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "type" "TerritoryType" NOT NULL,
    "ibge_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicators" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dataset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicator_values" (
    "id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "indicator_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicator_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geometries" (
    "id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "geojson" JSONB NOT NULL,
    "simplified" BOOLEAN NOT NULL DEFAULT true,
    "bbox" JSONB,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geometries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache_requests" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "territories_ibge_code_key" ON "territories"("ibge_code");

-- CreateIndex
CREATE INDEX "territories_type_idx" ON "territories"("type");

-- CreateIndex
CREATE INDEX "territories_parent_id_idx" ON "territories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "indicators_slug_key" ON "indicators"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "indicator_values_territory_id_indicator_id_year_key" ON "indicator_values"("territory_id", "indicator_id", "year");

-- CreateIndex
CREATE INDEX "indicator_values_indicator_id_year_idx" ON "indicator_values"("indicator_id", "year");

-- CreateIndex
CREATE INDEX "indicator_values_territory_id_year_idx" ON "indicator_values"("territory_id", "year");

-- CreateIndex
CREATE INDEX "geometries_territory_id_simplified_idx" ON "geometries"("territory_id", "simplified");

-- CreateIndex
CREATE UNIQUE INDEX "geometries_territory_id_hash_key" ON "geometries"("territory_id", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "cache_requests_key_key" ON "cache_requests"("key");

-- CreateIndex
CREATE INDEX "cache_requests_expires_at_idx" ON "cache_requests"("expires_at");

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "indicators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geometries" ADD CONSTRAINT "geometries_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;


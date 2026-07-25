-- AlterEnum
ALTER TYPE "SectionType" ADD VALUE 'IMPACT';

-- CreateTable
CREATE TABLE "ImpactStory" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "imagePublicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ImpactStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactMetric" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImpactMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImpactStory_sectionId_order_idx" ON "ImpactStory"("sectionId", "order");

-- CreateIndex
CREATE INDEX "ImpactMetric_sectionId_order_idx" ON "ImpactMetric"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "ImpactStory" ADD CONSTRAINT "ImpactStory_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactMetric" ADD CONSTRAINT "ImpactMetric_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `CreativePlan`
    ADD COLUMN `stage` VARCHAR(191) NULL,
    ADD COLUMN `renderMode` VARCHAR(191) NULL,
    ADD COLUMN `agentTrace` JSON NULL,
    ADD COLUMN `strategyId` VARCHAR(191) NULL,
    ADD COLUMN `version` INTEGER NULL,
    ADD COLUMN `parentPlanId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Scene`
    ADD COLUMN `goal` VARCHAR(191) NULL,
    ADD COLUMN `materialUsage` VARCHAR(191) NULL,
    ADD COLUMN `negativePrompt` VARCHAR(191) NULL,
    ADD COLUMN `previewVideoUrl` VARCHAR(191) NULL,
    ADD COLUMN `renderStatus` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `GenerationTask`
    ADD COLUMN `type` VARCHAR(191) NULL,
    ADD COLUMN `resultId` VARCHAR(191) NULL,
    ADD COLUMN `renderMode` VARCHAR(191) NULL;

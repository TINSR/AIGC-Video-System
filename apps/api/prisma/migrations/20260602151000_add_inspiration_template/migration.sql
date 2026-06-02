-- AlterTable
ALTER TABLE `CreativePlan`
    ADD COLUMN `templateId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `InspirationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `strategy` TEXT NOT NULL,
    `hookType` VARCHAR(191) NOT NULL,
    `style` VARCHAR(191) NOT NULL,
    `factors` JSON NOT NULL,
    `constraints` JSON NOT NULL,
    `sceneGoals` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `referenceVideoIds` JSON NOT NULL,
    `sourceMode` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

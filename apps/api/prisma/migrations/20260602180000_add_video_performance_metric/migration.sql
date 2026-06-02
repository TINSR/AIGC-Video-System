-- CreateTable
CREATE TABLE `VideoPerformanceMetric` (
    `id` VARCHAR(191) NOT NULL,
    `videoId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `creativePlanId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `plays` INTEGER NOT NULL,
    `clicks` INTEGER NOT NULL,
    `conversions` INTEGER NOT NULL,
    `averageWatchRate` DOUBLE NOT NULL,
    `collectedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VideoPerformanceMetric_templateId_idx`(`templateId`),
    INDEX `VideoPerformanceMetric_source_idx`(`source`),
    INDEX `VideoPerformanceMetric_collectedAt_idx`(`collectedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetricsImportBatch` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `totalRows` INTEGER NOT NULL,
    `acceptedRows` INTEGER NOT NULL,
    `rejectedRows` INTEGER NOT NULL,
    `errors` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

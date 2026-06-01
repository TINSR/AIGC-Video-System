-- CreateTable
CREATE TABLE `ReferenceVideo` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `sourcePlatform` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceUrl` TEXT NULL,
    `sourceNote` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `keywords` JSON NULL,
    `fileUrl` VARCHAR(191) NULL,
    `publicUrl` TEXT NULL,
    `cloudStatus` VARCHAR(191) NULL,
    `analysisStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `analysis` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

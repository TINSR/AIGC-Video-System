-- CreateTable
CREATE TABLE `MaterialClip` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `materialId` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `startTime` DOUBLE NULL,
    `endTime` DOUBLE NULL,
    `duration` DOUBLE NOT NULL,
    `summary` TEXT NOT NULL,
    `tags` JSON NOT NULL,
    `sceneType` VARCHAR(191) NOT NULL,
    `visualQuality` DOUBLE NOT NULL,
    `motionLevel` VARCHAR(191) NOT NULL,
    `suitableGoals` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MaterialClip_productId_idx`(`productId`),
    INDEX `MaterialClip_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SceneClipMatch` (
    `id` VARCHAR(191) NOT NULL,
    `creativePlanId` VARCHAR(191) NOT NULL,
    `sceneId` VARCHAR(191) NOT NULL,
    `clipId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `reasons` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SceneClipMatch_creativePlanId_idx`(`creativePlanId`),
    INDEX `SceneClipMatch_sceneId_idx`(`sceneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

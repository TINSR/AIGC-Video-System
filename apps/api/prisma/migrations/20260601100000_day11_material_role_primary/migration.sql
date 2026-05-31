-- Day11: material role classification and user-confirmed primary image
ALTER TABLE `Material` ADD COLUMN `role` VARCHAR(191) NULL;
ALTER TABLE `Material` ADD COLUMN `roleConfidence` DOUBLE NULL;
ALTER TABLE `Material` ADD COLUMN `roleReason` TEXT NULL;
ALTER TABLE `Material` ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT false;

-- Day11 follow-up: persist AI analysis metadata after role/isPrimary migration.
ALTER TABLE `Material` ADD COLUMN `roleConfidence` DOUBLE NULL;
ALTER TABLE `Material` ADD COLUMN `roleReason` TEXT NULL;

-- Day10: material public URL and cloud upload status
ALTER TABLE `Material` MODIFY COLUMN `publicUrl` TEXT NULL;
ALTER TABLE `Material` ADD COLUMN `cloudStatus` VARCHAR(191) NULL;

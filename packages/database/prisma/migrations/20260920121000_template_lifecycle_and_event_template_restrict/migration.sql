-- AlterTable
ALTER TABLE `templates` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'HIDDEN';

-- Backfill existing five approved production templates to AVAILABLE
UPDATE `templates` SET `status` = 'AVAILABLE' WHERE `theme_code` IN ('IVORY_GARDEN', 'SERENE_GARDEN', 'SUNDA_PUSPA', 'CLASSIC_LETTER', 'VELVET_LETTER');

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_template_id_fkey`;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

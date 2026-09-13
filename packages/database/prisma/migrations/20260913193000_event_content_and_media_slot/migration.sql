-- AlterTable
ALTER TABLE `events` ADD COLUMN `content` JSON NULL;

-- AlterTable
ALTER TABLE `medias` ADD COLUMN `slot` VARCHAR(50) NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX `medias_event_id_slot_idx` ON `medias`(`event_id`, `slot`);

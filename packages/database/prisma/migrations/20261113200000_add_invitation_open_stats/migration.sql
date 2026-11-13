-- AlterTable
ALTER TABLE `invitations` ADD COLUMN `first_opened_at` DATETIME(3) NULL,
    ADD COLUMN `last_opened_at` DATETIME(3) NULL,
    ADD COLUMN `open_count` INTEGER NOT NULL DEFAULT 0;


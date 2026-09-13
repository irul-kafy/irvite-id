ALTER TABLE `events` ADD COLUMN `content` JSON NULL;
ALTER TABLE `invitations`
  ADD COLUMN `wish_name` VARCHAR(80) NULL,
  ADD COLUMN `wish_message` VARCHAR(1000) NULL,
  ADD COLUMN `wished_at` DATETIME(3) NULL;

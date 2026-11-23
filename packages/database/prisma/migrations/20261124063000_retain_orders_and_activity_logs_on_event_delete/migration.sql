-- Alter orders.event_id to nullable and switch foreign keys on orders and activity_logs to ON DELETE SET NULL
ALTER TABLE `orders` DROP FOREIGN KEY `orders_event_id_fkey`;
ALTER TABLE `orders` MODIFY `event_id` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD CONSTRAINT `orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `activity_logs` DROP FOREIGN KEY `activity_logs_event_id_fkey`;
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

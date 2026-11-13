-- CreateTable
CREATE TABLE `offline_sync_ops` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `op_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `device_id` VARCHAR(191) NULL,
    `scanned_by_id` VARCHAR(191) NULL,
    `client_timestamp` DATETIME(3) NOT NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `offline_sync_ops_event_id_idx`(`event_id`),
    INDEX `offline_sync_ops_event_id_created_at_idx`(`event_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offline_sync_ops` ADD CONSTRAINT `offline_sync_ops_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


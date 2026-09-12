-- CreateIndex
CREATE UNIQUE INDEX `attendances_invitation_id_key` ON `attendances`(`invitation_id`);

-- DropIndex
DROP INDEX `attendances_invitation_id_idx` ON `attendances`;

-- CreateTable
CREATE TABLE `staff_events` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_events_user_id_idx`(`user_id`),
    UNIQUE INDEX `staff_events_event_id_user_id_key`(`event_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff_events` ADD CONSTRAINT `staff_events_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_events` ADD CONSTRAINT `staff_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

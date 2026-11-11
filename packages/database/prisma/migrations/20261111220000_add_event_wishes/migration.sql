CREATE TABLE `wishes` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wishes_event_id_idx`(`event_id`),
    INDEX `wishes_event_id_created_at_idx`(`event_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `wishes`
ADD CONSTRAINT `wishes_event_id_fkey`
FOREIGN KEY (`event_id`) REFERENCES `events`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

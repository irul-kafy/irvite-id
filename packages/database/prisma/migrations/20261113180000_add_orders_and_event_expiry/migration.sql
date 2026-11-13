-- AlterTable
ALTER TABLE `events` ADD COLUMN `active_until` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `reference_code` VARCHAR(191) NOT NULL,
    `client_name` VARCHAR(191) NOT NULL,
    `client_whatsapp` VARCHAR(191) NOT NULL,
    `package_code` VARCHAR(191) NOT NULL DEFAULT 'GOLD',
    `price_amount` INTEGER NOT NULL DEFAULT 199000,
    `status` ENUM('DRAFT', 'AWAITING_PAYMENT', 'PAID', 'IN_PROGRESS', 'LIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `paid_at` DATETIME(3) NULL,
    `payment_proof_media_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_event_id_key`(`event_id`),
    UNIQUE INDEX `orders_reference_code_key`(`reference_code`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_reference_code_idx`(`reference_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


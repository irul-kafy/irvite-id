-- AlterTable
ALTER TABLE `events`
    ADD COLUMN `ticket_status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ENDED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `venue` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(120) NULL,
    ADD COLUMN `category` VARCHAR(80) NULL,
    ADD COLUMN `start_at` DATETIME(3) NULL,
    ADD COLUMN `end_at` DATETIME(3) NULL,
    ADD COLUMN `banner_url` VARCHAR(500) NULL,
    ADD COLUMN `organizer_name` VARCHAR(150) NULL,
    ADD COLUMN `tax_rate_percent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `tax_included` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `service_fee` INTEGER NOT NULL DEFAULT 3000;

-- CreateIndex
CREATE INDEX `events_ticket_status_start_at_idx` ON `events`(`ticket_status`, `start_at`);

-- CreateTable
CREATE TABLE `ticket_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `quota` INTEGER NOT NULL DEFAULT 100,
    `sold_count` INTEGER NOT NULL DEFAULT 0,
    `sales_start_at` DATETIME(3) NULL,
    `sales_end_at` DATETIME(3) NULL,
    `max_per_order` INTEGER NOT NULL DEFAULT 10,
    `benefits` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_tiers_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_orders` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `tier_id` VARCHAR(191) NOT NULL,
    `order_code` VARCHAR(64) NOT NULL,
    `access_token_hash` VARCHAR(191) NULL,
    `buyer_name` VARCHAR(150) NOT NULL,
    `buyer_email` VARCHAR(191) NOT NULL,
    `buyer_whatsapp` VARCHAR(40) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` INTEGER NOT NULL DEFAULT 0,
    `subtotal` INTEGER NOT NULL DEFAULT 0,
    `service_fee` INTEGER NOT NULL DEFAULT 3000,
    `tax_amount` INTEGER NOT NULL DEFAULT 0,
    `total_amount` INTEGER NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(40) NOT NULL DEFAULT 'QRIS',
    `payment_reference` VARCHAR(120) NULL,
    `status` ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `email_corrected_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ticket_orders_order_code_key`(`order_code`),
    INDEX `ticket_orders_event_id_status_idx`(`event_id`, `status`),
    INDEX `ticket_orders_order_code_idx`(`order_code`),
    INDEX `ticket_orders_buyer_email_idx`(`buyer_email`),
    INDEX `ticket_orders_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `issued_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `tier_id` VARCHAR(191) NOT NULL,
    `ticket_code` VARCHAR(64) NOT NULL,
    `attendee_name` VARCHAR(150) NOT NULL,
    `attendee_email` VARCHAR(191) NOT NULL,
    `status` ENUM('ISSUED', 'CHECKED_IN', 'VOID') NOT NULL DEFAULT 'ISSUED',
    `checked_in_at` DATETIME(3) NULL,
    `checked_in_by` VARCHAR(191) NULL,
    `checked_in_gate` VARCHAR(80) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `issued_tickets_ticket_code_key`(`ticket_code`),
    INDEX `issued_tickets_event_id_status_idx`(`event_id`, `status`),
    INDEX `issued_tickets_order_id_idx`(`order_id`),
    INDEX `issued_tickets_ticket_code_idx`(`ticket_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_check_in_logs` (
    `id` VARCHAR(191) NOT NULL,
    `issued_ticket_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `scanned_by` VARCHAR(191) NULL,
    `gate_name` VARCHAR(80) NOT NULL DEFAULT 'Gerbang utama',
    `result` VARCHAR(30) NOT NULL DEFAULT 'VALID',
    `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_check_in_logs_event_id_scanned_at_idx`(`event_id`, `scanned_at`),
    INDEX `ticket_check_in_logs_issued_ticket_id_idx`(`issued_ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eo_inquiries` (
    `id` VARCHAR(191) NOT NULL,
    `inquiry_code` VARCHAR(64) NOT NULL,
    `organizer_name` VARCHAR(150) NOT NULL,
    `event_name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `estimated_audience` VARCHAR(80) NOT NULL,
    `contact_name` VARCHAR(150) NULL,
    `contact_email` VARCHAR(191) NULL,
    `contact_whatsapp` VARCHAR(40) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `eo_inquiries_inquiry_code_key`(`inquiry_code`),
    INDEX `eo_inquiries_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ticket_tiers` ADD CONSTRAINT `ticket_tiers_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_orders` ADD CONSTRAINT `ticket_orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_orders` ADD CONSTRAINT `ticket_orders_tier_id_fkey` FOREIGN KEY (`tier_id`) REFERENCES `ticket_tiers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `issued_tickets` ADD CONSTRAINT `issued_tickets_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `ticket_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `issued_tickets` ADD CONSTRAINT `issued_tickets_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `issued_tickets` ADD CONSTRAINT `issued_tickets_tier_id_fkey` FOREIGN KEY (`tier_id`) REFERENCES `ticket_tiers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_check_in_logs` ADD CONSTRAINT `ticket_check_in_logs_issued_ticket_id_fkey` FOREIGN KEY (`issued_ticket_id`) REFERENCES `issued_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

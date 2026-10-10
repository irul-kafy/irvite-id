ALTER TABLE `templates` ADD COLUMN `renderer` VARCHAR(20) NOT NULL DEFAULT 'CODED';

CREATE TABLE `template_assets` (
    `id` VARCHAR(191) NOT NULL,
    `template_id` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(50) NOT NULL,
    `storage_key` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `template_assets_template_id_idx`(`template_id`),
    UNIQUE INDEX `template_assets_template_id_slot_order_key`(`template_id`, `slot`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `template_assets`
ADD CONSTRAINT `template_assets_template_id_fkey`
FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

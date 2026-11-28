-- CreateTable
CREATE TABLE IF NOT EXISTS `master_pricing_configs` (
    `id` VARCHAR(191) NOT NULL,
    `version` INT NOT NULL DEFAULT 1,
    `config` JSON NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `master_pricing_configs_created_at_idx`(`created_at`),
    INDEX `master_pricing_configs_version_created_at_idx`(`version`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

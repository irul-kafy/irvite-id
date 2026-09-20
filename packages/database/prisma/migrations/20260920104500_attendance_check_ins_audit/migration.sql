-- CreateTable
CREATE TABLE `attendance_check_ins` (
    `id` VARCHAR(191) NOT NULL,
    `attendance_id` VARCHAR(191) NOT NULL,
    `scanned_by_id` VARCHAR(191) NOT NULL,
    `scanned_pax` INTEGER NOT NULL DEFAULT 1,
    `scanned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attendance_check_ins_attendance_id_idx`(`attendance_id`),
    INDEX `attendance_check_ins_scanned_by_id_idx`(`scanned_by_id`),
    INDEX `attendance_check_ins_scanned_at_idx`(`scanned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance_check_ins` ADD CONSTRAINT `attendance_check_ins_attendance_id_fkey` FOREIGN KEY (`attendance_id`) REFERENCES `attendances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_check_ins` ADD CONSTRAINT `attendance_check_ins_scanned_by_id_fkey` FOREIGN KEY (`scanned_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing attendances into attendance_check_ins
INSERT INTO `attendance_check_ins` (`id`, `attendance_id`, `scanned_by_id`, `scanned_pax`, `scanned_at`, `created_at`)
SELECT UUID(), `id`, `scanned_by_id`, `scanned_pax`, `scanned_at`, `scanned_at`
FROM `attendances`;

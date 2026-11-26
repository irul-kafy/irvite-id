-- Create audit table to preserve old category and old phone_number before normalization or deduplication
CREATE TABLE IF NOT EXISTS `guests_migration_audit` (
  `guest_id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(191) NOT NULL,
  `old_category` VARCHAR(191) NULL,
  `old_phone_number` VARCHAR(191) NULL,
  `change_reason` VARCHAR(191) NOT NULL,
  `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`guest_id`),
  INDEX `guests_migration_audit_event_id_idx`(`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1. Audit guests whose category will be changed by normalization
INSERT INTO `guests_migration_audit` (`guest_id`, `event_id`, `old_category`, `old_phone_number`, `change_reason`)
SELECT
  g.`id`,
  g.`event_id`,
  g.`category`,
  g.`phone_number`,
  'CATEGORY_NORMALIZED'
FROM `guests` g
WHERE g.`category` IS NULL
   OR BINARY g.`category` != BINARY (
     CASE
       WHEN UPPER(TRIM(g.`category`)) IN ('REGULAR', 'UMUM') THEN 'REGULAR'
       WHEN UPPER(TRIM(g.`category`)) = 'VIP' THEN 'VIP'
       WHEN UPPER(TRIM(g.`category`)) = 'VVIP' THEN 'VVIP'
       WHEN UPPER(TRIM(g.`category`)) IN ('FAMILY', 'KELUARGA') THEN 'FAMILY'
       WHEN UPPER(TRIM(g.`category`)) IN ('FAMILY_GROOM', 'FAMILY GROOM', 'KELUARGA_PRIA', 'KELUARGA PRIA', 'KELUARGA CPP', 'KELUARGA MEMPELAI PRIA') THEN 'FAMILY_GROOM'
       WHEN UPPER(TRIM(g.`category`)) IN ('FAMILY_BRIDE', 'FAMILY BRIDE', 'KELUARGA_WANITA', 'KELUARGA WANITA', 'KELUARGA CPW', 'KELUARGA MEMPELAI WANITA') THEN 'FAMILY_BRIDE'
       WHEN UPPER(TRIM(g.`category`)) IN ('FRIEND', 'TEMAN') THEN 'FRIEND'
       WHEN UPPER(TRIM(g.`category`)) IN ('COLLEAGUE', 'KANTOR', 'TEMAN KANTOR', 'REKAN_KERJA', 'REKAN KERJA') THEN 'COLLEAGUE'
       WHEN UPPER(TRIM(g.`category`)) IN ('ON_THE_SPOT', 'ON THE SPOT') THEN 'ON_THE_SPOT'
       ELSE 'REGULAR'
     END
   )
ON DUPLICATE KEY UPDATE
  `change_reason` = CONCAT(`change_reason`, ',CATEGORY_NORMALIZED');

-- Normalize existing guest categories to the canonical list (REGULAR, VIP, VVIP, FAMILY, FAMILY_GROOM, FAMILY_BRIDE, FRIEND, COLLEAGUE, ON_THE_SPOT)
UPDATE `guests`
SET `category` = CASE
  WHEN UPPER(TRIM(`category`)) IN ('REGULAR', 'UMUM') THEN 'REGULAR'
  WHEN UPPER(TRIM(`category`)) = 'VIP' THEN 'VIP'
  WHEN UPPER(TRIM(`category`)) = 'VVIP' THEN 'VVIP'
  WHEN UPPER(TRIM(`category`)) IN ('FAMILY', 'KELUARGA') THEN 'FAMILY'
  WHEN UPPER(TRIM(`category`)) IN ('FAMILY_GROOM', 'FAMILY GROOM', 'KELUARGA_PRIA', 'KELUARGA PRIA', 'KELUARGA CPP', 'KELUARGA MEMPELAI PRIA') THEN 'FAMILY_GROOM'
  WHEN UPPER(TRIM(`category`)) IN ('FAMILY_BRIDE', 'FAMILY BRIDE', 'KELUARGA_WANITA', 'KELUARGA WANITA', 'KELUARGA CPW', 'KELUARGA MEMPELAI WANITA') THEN 'FAMILY_BRIDE'
  WHEN UPPER(TRIM(`category`)) IN ('FRIEND', 'TEMAN') THEN 'FRIEND'
  WHEN UPPER(TRIM(`category`)) IN ('COLLEAGUE', 'KANTOR', 'TEMAN KANTOR', 'REKAN_KERJA', 'REKAN KERJA') THEN 'COLLEAGUE'
  WHEN UPPER(TRIM(`category`)) IN ('ON_THE_SPOT', 'ON THE SPOT') THEN 'ON_THE_SPOT'
  ELSE 'REGULAR'
END;

-- 2. Audit guests whose phone_number will be cleared (blank) or reformatted (spaces, dashes, parens, dots, +, 08..., 8...)
INSERT INTO `guests_migration_audit` (`guest_id`, `event_id`, `old_category`, `old_phone_number`, `change_reason`)
SELECT
  g.`id`,
  g.`event_id`,
  g.`category`,
  g.`phone_number`,
  'PHONE_NORMALIZED'
FROM `guests` g
WHERE g.`phone_number` IS NOT NULL
  AND (
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(g.`phone_number`), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ''
    OR g.`phone_number` LIKE '% %'
    OR g.`phone_number` LIKE '%-%'
    OR g.`phone_number` LIKE '%(%'
    OR g.`phone_number` LIKE '%)%'
    OR g.`phone_number` LIKE '%.%'
    OR TRIM(g.`phone_number`) LIKE '+%'
    OR TRIM(g.`phone_number`) LIKE '08%'
    OR TRIM(g.`phone_number`) LIKE '8%'
  )
ON DUPLICATE KEY UPDATE
  `change_reason` = CONCAT(`change_reason`, ',PHONE_NORMALIZED');

-- Strip spaces, hyphens/dashes, parentheses, and dots from phone_number (aligned with normalizePhoneNumber)
UPDATE `guests`
SET `phone_number` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(`phone_number`), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')
WHERE `phone_number` IS NOT NULL;

-- Strip leading '+' if present
UPDATE `guests`
SET `phone_number` = SUBSTRING(`phone_number`, 2)
WHERE `phone_number` IS NOT NULL AND `phone_number` LIKE '+%';

-- Normalize blank phone numbers to NULL
UPDATE `guests`
SET `phone_number` = NULL
WHERE `phone_number` IS NOT NULL AND TRIM(`phone_number`) = '';

-- Standardize 08... and 8... to 628...
UPDATE `guests`
SET `phone_number` = CONCAT('62', SUBSTRING(`phone_number`, 2))
WHERE `phone_number` IS NOT NULL AND `phone_number` LIKE '08%';

UPDATE `guests`
SET `phone_number` = CONCAT('62', `phone_number`)
WHERE `phone_number` IS NOT NULL AND `phone_number` LIKE '8%';

-- 3. Audit duplicate (event_id, phone_number) rows before clearing phone_number on later duplicates
INSERT INTO `guests_migration_audit` (`guest_id`, `event_id`, `old_category`, `old_phone_number`, `change_reason`)
SELECT
  g1.`id`,
  g1.`event_id`,
  g1.`category`,
  g1.`phone_number`,
  'PHONE_DEDUP_CLEARED'
FROM `guests` g1
INNER JOIN `guests` g2
  ON g1.`event_id` = g2.`event_id`
  AND g1.`phone_number` = g2.`phone_number`
  AND (g1.`created_at` > g2.`created_at` OR (g1.`created_at` = g2.`created_at` AND g1.`id` > g2.`id`))
WHERE g1.`phone_number` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `change_reason` = CONCAT(`change_reason`, ',PHONE_DEDUP_CLEARED');

-- Deduplicate any existing guests sharing the same (event_id, phone_number) by clearing phone_number on later duplicates
UPDATE `guests` g1
INNER JOIN `guests` g2
  ON g1.`event_id` = g2.`event_id`
  AND g1.`phone_number` = g2.`phone_number`
  AND (g1.`created_at` > g2.`created_at` OR (g1.`created_at` = g2.`created_at` AND g1.`id` > g2.`id`))
SET g1.`phone_number` = NULL
WHERE g1.`phone_number` IS NOT NULL;

-- CreateIndex: unique phone number per event
CREATE UNIQUE INDEX `guests_event_id_phone_number_key` ON `guests`(`event_id`, `phone_number`);

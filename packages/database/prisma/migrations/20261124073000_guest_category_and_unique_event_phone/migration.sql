-- Normalize existing guest categories to the canonical list (REGULAR, VIP, VVIP, FAMILY, FRIEND, COLLEAGUE, ON_THE_SPOT)
UPDATE `guests`
SET `category` = CASE
  WHEN UPPER(TRIM(`category`)) IN ('REGULAR', 'UMUM') THEN 'REGULAR'
  WHEN UPPER(TRIM(`category`)) = 'VIP' THEN 'VIP'
  WHEN UPPER(TRIM(`category`)) = 'VVIP' THEN 'VVIP'
  WHEN UPPER(TRIM(`category`)) IN ('FAMILY', 'KELUARGA') THEN 'FAMILY'
  WHEN UPPER(TRIM(`category`)) IN ('FRIEND', 'TEMAN') THEN 'FRIEND'
  WHEN UPPER(TRIM(`category`)) IN ('COLLEAGUE', 'KANTOR', 'TEMAN KANTOR', 'REKAN_KERJA', 'REKAN KERJA') THEN 'COLLEAGUE'
  WHEN UPPER(TRIM(`category`)) IN ('ON_THE_SPOT', 'ON THE SPOT') THEN 'ON_THE_SPOT'
  ELSE 'REGULAR'
END;

-- Normalize blank phone numbers to NULL and standardize 08... / +628... to 628...
UPDATE `guests`
SET `phone_number` = NULL
WHERE `phone_number` IS NOT NULL AND TRIM(`phone_number`) = '';

UPDATE `guests`
SET `phone_number` = CONCAT('62', SUBSTRING(TRIM(`phone_number`), 2))
WHERE `phone_number` IS NOT NULL AND TRIM(`phone_number`) LIKE '08%';

UPDATE `guests`
SET `phone_number` = SUBSTRING(TRIM(`phone_number`), 2)
WHERE `phone_number` IS NOT NULL AND TRIM(`phone_number`) LIKE '+628%';

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

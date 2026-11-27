-- 1. Ensure guests_migration_audit table exists on databases that ran the older version of 20261124073000
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

-- 2a. Rotate clientKey and set $.clientKeyVersion = 2 ONLY when:
--     - content / clientKey is missing or empty, OR
--     - $.clientKeyVersion is missing (< 2) AND $.clientKey matches UUID v1 24-hex pattern (^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$)
SET @rotate_uuid_v1_or_empty_sql = IF(
  VERSION() LIKE '%MariaDB%',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(SUBSTRING(SHA2(CONCAT(UUID(), RAND(), NOW(6), CONNECTION_ID()), 256), 1, 24)), ''$.clientKeyVersion'', 2) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR (COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKeyVersion'')) AS UNSIGNED), 0) < 2 AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey''))) REGEXP ''^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$'')',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(HEX(RANDOM_BYTES(12))), ''$.clientKeyVersion'', 2) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR (COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKeyVersion'')) AS UNSIGNED), 0) < 2 AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey''))) REGEXP ''^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$'')'
);
PREPARE rotate_uuid_v1_or_empty_stmt FROM @rotate_uuid_v1_or_empty_sql;
EXECUTE rotate_uuid_v1_or_empty_stmt;
DEALLOCATE PREPARE rotate_uuid_v1_or_empty_stmt;

-- 2b. For non-empty clientKey values without $.clientKeyVersion = 2 that are NOT UUID v1:
--     preserve the existing clientKey and only stamp $.clientKeyVersion = 2
UPDATE `events`
SET `content` = JSON_SET(`content`, '$.clientKeyVersion', 2)
WHERE `content` IS NOT NULL
  AND JSON_TYPE(`content`) = 'OBJECT'
  AND JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKey')) IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKey')) != ''
  AND COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKeyVersion')) AS UNSIGNED), 0) < 2
  AND NOT (LOWER(JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKey'))) REGEXP '^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$');

-- 3. Backfill is_walk_in = true for legacy walk-in guests with category ON_THE_SPOT
--    that have an Attendance record and ZERO attendance_check_ins rows (regardless of invitation status such as RSVP_YES)
UPDATE `guests` g
INNER JOIN `invitations` i ON i.`guest_id` = g.`id`
INNER JOIN `attendances` a ON a.`invitation_id` = i.`id`
SET g.`is_walk_in` = true
WHERE UPPER(TRIM(g.`category`)) IN ('ON_THE_SPOT', 'ON THE SPOT')
  AND (
    SELECT COUNT(*)
    FROM `attendance_check_ins` aci
    WHERE aci.`attendance_id` = a.`id`
  ) = 0;

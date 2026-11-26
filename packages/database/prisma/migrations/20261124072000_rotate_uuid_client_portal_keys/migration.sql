-- Rotate clientKey values that do not yet carry explicit $.clientKeyVersion = 2 to LOWER(HEX(RANDOM_BYTES(12)))
-- and stamp $.clientKeyVersion = 2 so valid random v2 keys are never rotated again.
SET @rotate_client_key_sql = IF(
  VERSION() LIKE '%MariaDB%',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(SUBSTRING(SHA2(CONCAT(UUID(), RAND(), NOW(6), CONNECTION_ID()), 256), 1, 24)), ''$.clientKeyVersion'', 2) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKeyVersion'')) AS UNSIGNED), 0) < 2',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(HEX(RANDOM_BYTES(12))), ''$.clientKeyVersion'', 2) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKeyVersion'')) AS UNSIGNED), 0) < 2'
);
PREPARE rotate_client_key_stmt FROM @rotate_client_key_sql;
EXECUTE rotate_client_key_stmt;
DEALLOCATE PREPARE rotate_client_key_stmt;

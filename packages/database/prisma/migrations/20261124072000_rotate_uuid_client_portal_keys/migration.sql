-- Rotate clientKey values that were generated via UUID() v1 (or missing/empty) to LOWER(HEX(RANDOM_BYTES(12)))
-- Uses native LOWER(HEX(RANDOM_BYTES(12))) on MySQL 8.0+, with a MariaDB-safe fallback when running on local MariaDB
SET @rotate_client_key_sql = IF(
  VERSION() LIKE '%MariaDB%',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(SUBSTRING(SHA2(CONCAT(UUID(), RAND(), NOW(6), CONNECTION_ID()), 256), 1, 24))) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey''))) REGEXP ''^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$''',
  'UPDATE `events` SET `content` = JSON_SET(CASE WHEN `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' THEN JSON_OBJECT() ELSE `content` END, ''$.clientKey'', LOWER(HEX(RANDOM_BYTES(12)))) WHERE `content` IS NULL OR JSON_TYPE(`content`) != ''OBJECT'' OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey'')) = '''' OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(`content`, ''$.clientKey''))) REGEXP ''^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$'''
);
PREPARE rotate_client_key_stmt FROM @rotate_client_key_sql;
EXECUTE rotate_client_key_stmt;
DEALLOCATE PREPARE rotate_client_key_stmt;

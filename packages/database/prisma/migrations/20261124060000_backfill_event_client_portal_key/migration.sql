-- Backfill random 24-hex-char clientKey for existing events that do not have content.clientKey
UPDATE `events`
SET `content` = JSON_SET(
  CASE
    WHEN `content` IS NULL OR JSON_TYPE(`content`) != 'OBJECT' THEN JSON_OBJECT()
    ELSE `content`
  END,
  '$.clientKey',
  LOWER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 24))
)
WHERE
  `content` IS NULL
  OR JSON_TYPE(`content`) != 'OBJECT'
  OR JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKey')) IS NULL
  OR JSON_UNQUOTE(JSON_EXTRACT(`content`, '$.clientKey')) = '';

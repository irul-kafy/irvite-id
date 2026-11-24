-- Remove deprecated _mediaFallback base64 blobs from events.content JSON after migrating files to MediaStorageService
UPDATE `events`
SET `content` = JSON_REMOVE(`content`, '$._mediaFallback')
WHERE `content` IS NOT NULL
  AND JSON_TYPE(`content`) = 'OBJECT'
  AND JSON_EXTRACT(`content`, '$._mediaFallback') IS NOT NULL;

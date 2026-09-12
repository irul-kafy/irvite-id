export const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || '';
export const TRANSPORT_FILE_SIZE_LIMIT = 20 * 1024 * 1024; // 20 MiB transport limit
export const TYPE_SIZE_LIMITS = {
  PHOTO: 5 * 1024 * 1024,
  THUMBNAIL: 5 * 1024 * 1024,
  AUDIO: 10 * 1024 * 1024,
  VIDEO: 20 * 1024 * 1024,
};

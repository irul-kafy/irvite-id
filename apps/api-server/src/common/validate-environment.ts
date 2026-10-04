import * as path from 'node:path';

export function validateEnvironment(config: Record<string, unknown>) {
  const secret = config.JWT_ACCESS_SECRET;
  if (typeof secret !== 'string' || !secret.trim()) {
    throw new Error('JWT_ACCESS_SECRET is required.');
  }
  const expiration = config.JWT_ACCESS_EXPIRATION || '12h';
  if (typeof expiration !== 'string' || !/^[1-9]\d*[smhd]$/.test(expiration)) {
    throw new Error(
      'JWT_ACCESS_EXPIRATION must be a positive duration (e.g. 12h).',
    );
  }
  config.JWT_ACCESS_EXPIRATION = expiration;
  if (config.NODE_ENV === 'production') {
    if (secret.length < 32 || /replace_with|test.only|changeme/i.test(secret)) {
      throw new Error(
        'Production requires a random JWT_ACCESS_SECRET of at least 32 characters.',
      );
    }
    if (
      typeof config.DATABASE_URL !== 'string' ||
      !config.DATABASE_URL.startsWith('mysql://')
    ) {
      throw new Error('Production requires a MySQL DATABASE_URL.');
    }
    if (
      typeof config.MEDIA_STORAGE_PATH !== 'string' ||
      !path.isAbsolute(config.MEDIA_STORAGE_PATH)
    ) {
      throw new Error(
        'Production requires an absolute MEDIA_STORAGE_PATH on a persistent volume.',
      );
    }
  }
  return config;
}

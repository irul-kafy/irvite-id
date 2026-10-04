import { validateEnvironment } from './validate-environment';
import * as path from 'node:path';

describe('environment validation', () => {
  const production = () => ({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'x'.repeat(48),
    DATABASE_URL: 'mysql://user:password@localhost:3306/isolated_test',
    MEDIA_STORAGE_PATH: path.resolve('storage/test'),
  });
  it('defaults to a 12-hour session', () => {
    expect(
      validateEnvironment({ JWT_ACCESS_SECRET: 'local-test' })
        .JWT_ACCESS_EXPIRATION,
    ).toBe('12h');
  });
  it.each(['0s', '-1h', '12', 'forever'])(
    'rejects invalid duration %s',
    (value) => {
      expect(() =>
        validateEnvironment({
          JWT_ACCESS_SECRET: 'test',
          JWT_ACCESS_EXPIRATION: value,
        }),
      ).toThrow();
    },
  );
  it('accepts explicit production storage and rejects unsafe defaults', () => {
    expect(() => validateEnvironment(production())).not.toThrow();
    expect(() =>
      validateEnvironment({ ...production(), MEDIA_STORAGE_PATH: '' }),
    ).toThrow();
    expect(() =>
      validateEnvironment({
        ...production(),
        JWT_ACCESS_SECRET: 'replace_with_secure_random_secret',
      }),
    ).toThrow();
  });
});

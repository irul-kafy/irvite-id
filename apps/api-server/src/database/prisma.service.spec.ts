import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService.ensureSchemaCompatibility', () => {
  let service: PrismaService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new PrismaService();
    // Prevent actual connection attempts in unit tests
    jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs only read-only queries and never executes DDL or DELETE on startup', async () => {
    const executedRawQueries: string[] = [];
    jest.spyOn(service, '$queryRawUnsafe').mockImplementation(async (sql: string, ..._params: unknown[]) => {
      executedRawQueries.push(sql);
      if (sql.includes('SELECT DATABASE()')) {
        return [{ db: 'test_db' }] as never;
      }
      if (sql.includes('information_schema.TABLES')) {
        return [
          { TABLE_NAME: 'users' },
          { TABLE_NAME: 'events' },
          { TABLE_NAME: 'guests' },
          { TABLE_NAME: 'invitations' },
          { TABLE_NAME: 'orders' },
          { TABLE_NAME: 'activity_logs' },
          { TABLE_NAME: 'wishes' },
          { TABLE_NAME: 'offline_sync_ops' },
        ] as never;
      }
      if (sql.includes('information_schema.COLUMNS')) {
        return [
          { TABLE_NAME: 'guests', COLUMN_NAME: 'table_number' },
          { TABLE_NAME: 'guests', COLUMN_NAME: 'is_walk_in' },
          { TABLE_NAME: 'events', COLUMN_NAME: 'active_until' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'first_opened_at' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'last_opened_at' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'open_count' },
          { TABLE_NAME: 'orders', COLUMN_NAME: 'options' },
          { TABLE_NAME: 'orders', COLUMN_NAME: 'pricing_version' },
        ] as never;
      }
      return [] as never;
    });

    const executeRawUnsafeSpy = jest.spyOn(service, '$executeRawUnsafe').mockResolvedValue(0 as never);

    await service.onModuleInit();

    // Verify $executeRawUnsafe was NEVER called on startup
    expect(executeRawUnsafeSpy).not.toHaveBeenCalled();

    // Verify all executed queries are read-only SELECT queries
    expect(executedRawQueries.length).toBeGreaterThan(0);
    for (const q of executedRawQueries) {
      expect(q.trim().toUpperCase().startsWith('SELECT')).toBe(true);
      expect(q.toUpperCase().includes('DELETE')).toBe(false);
      expect(q.toUpperCase().includes('ALTER')).toBe(false);
      expect(q.toUpperCase().includes('DROP')).toBe(false);
    }

    // No warning should be logged when all schema requirements are satisfied
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a clear warning when essential tables or columns are missing', async () => {
    jest.spyOn(service, '$queryRawUnsafe').mockImplementation(async (sql: string, ..._params: unknown[]) => {
      if (sql.includes('SELECT DATABASE()')) {
        return [{ db: 'test_db' }] as never;
      }
      if (sql.includes('information_schema.TABLES')) {
        // Missing 'wishes' and 'offline_sync_ops'
        return [
          { TABLE_NAME: 'users' },
          { TABLE_NAME: 'events' },
          { TABLE_NAME: 'guests' },
          { TABLE_NAME: 'invitations' },
          { TABLE_NAME: 'orders' },
          { TABLE_NAME: 'activity_logs' },
        ] as never;
      }
      if (sql.includes('information_schema.COLUMNS')) {
        // Missing 'orders.options'
        return [
          { TABLE_NAME: 'guests', COLUMN_NAME: 'table_number' },
          { TABLE_NAME: 'guests', COLUMN_NAME: 'is_walk_in' },
          { TABLE_NAME: 'events', COLUMN_NAME: 'active_until' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'first_opened_at' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'last_opened_at' },
          { TABLE_NAME: 'invitations', COLUMN_NAME: 'open_count' },
          { TABLE_NAME: 'orders', COLUMN_NAME: 'pricing_version' },
        ] as never;
      }
      return [] as never;
    });

    await service.onModuleInit();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing essential table(s): wishes, offline_sync_ops'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing essential column(s): orders.options'),
    );
  });
});

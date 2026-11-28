import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from 'database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaCompatibility();
    this.logger.log('PrismaService connected to database.');
  }

  /**
   * Cold-start schema check:
   * Only inspects existing essential tables and columns in read-only mode.
   * Never executes DDL or destructive DELETE queries on startup.
   * If any schema elements are missing, logs a clear warning directing the
   * operator to run "node scripts/schema-sync.cjs".
   */
  private async ensureSchemaCompatibility() {
    const requiredTables = [
      'users',
      'events',
      'guests',
      'invitations',
      'orders',
      'activity_logs',
      'wishes',
      'offline_sync_ops',
    ];

    const requiredColumns: Record<string, string[]> = {
      guests: ['table_number', 'is_walk_in'],
      events: ['active_until'],
      invitations: ['first_opened_at', 'last_opened_at', 'open_count'],
      orders: ['options', 'pricing_version'],
    };

    try {
      if (typeof this.$queryRawUnsafe !== 'function') {
        return;
      }

      const dbRows = await this.$queryRawUnsafe<Array<{ db?: string; DATABASE?: string }>>(
        'SELECT DATABASE() AS db',
      );
      const currentDb = dbRows?.[0]?.db || dbRows?.[0]?.DATABASE;
      if (!currentDb) {
        return;
      }

      const tableRows = await this.$queryRawUnsafe<Array<{ TABLE_NAME: string }>>(
        'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
        currentDb,
      );
      const existingTables = new Set(
        Array.isArray(tableRows) ? tableRows.map((r) => r.TABLE_NAME) : [],
      );

      const missingTables = requiredTables.filter((t) => !existingTables.has(t));
      if (missingTables.length > 0) {
        this.logger.warn(
          `[SchemaCompatibility] Missing essential table(s): ${missingTables.join(', ')}. Please run "node scripts/schema-sync.cjs" to synchronize the database schema.`,
        );
      }

      const columnRows = await this.$queryRawUnsafe<
        Array<{ TABLE_NAME: string; COLUMN_NAME: string }>
      >(
        'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?',
        currentDb,
      );
      const existingColumns = new Set(
        Array.isArray(columnRows)
          ? columnRows.map((r) => `${r.TABLE_NAME}.${r.COLUMN_NAME}`)
          : [],
      );

      const missingColumns: string[] = [];
      for (const [table, cols] of Object.entries(requiredColumns)) {
        if (!existingTables.has(table)) {
          continue;
        }
        for (const col of cols) {
          if (!existingColumns.has(`${table}.${col}`)) {
            missingColumns.push(`${table}.${col}`);
          }
        }
      }

      if (missingColumns.length > 0) {
        this.logger.warn(
          `[SchemaCompatibility] Missing essential column(s): ${missingColumns.join(', ')}. Please run "node scripts/schema-sync.cjs" to synchronize the database schema.`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[SchemaCompatibility] Read-only schema verification skipped or restricted: ${msg}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected from database.');
  }
}

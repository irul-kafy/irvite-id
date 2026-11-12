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
  }

  private async ensureSchemaCompatibility() {
    try {
      await this.$executeRawUnsafe(
        'ALTER TABLE `guests` ADD COLUMN `table_number` VARCHAR(191) NULL',
      );
      this.logger.log(
        'Schema compatibility: ensured table_number column in guests table.',
      );
    } catch {
      // Column may already exist (ER_DUP_FIELDNAME) or user has restricted DDL; fail open safely
    }

    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`wishes\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`event_id\` VARCHAR(191) NOT NULL,
          \`name\` VARCHAR(120) NOT NULL,
          \`message\` VARCHAR(500) NOT NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          INDEX \`wishes_event_id_idx\`(\`event_id\`),
          INDEX \`wishes_event_id_created_at_idx\`(\`event_id\`, \`created_at\`),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      `);
      this.logger.log('Schema compatibility: ensured wishes table.');
    } catch {
      // Table may already exist or user has restricted DDL; fail open safely
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

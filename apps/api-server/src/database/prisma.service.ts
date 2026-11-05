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
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

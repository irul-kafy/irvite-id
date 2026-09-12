import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}
  getHealth(): string {
    return 'API is running';
  }

  async checkDatabaseHealth(): Promise<{ status: string; message: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database connection successful' };
    } catch {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}

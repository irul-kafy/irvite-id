import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma, Role } from 'database';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

export interface RecordActivityLogParams {
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId: string;
  eventId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit log entry.
   * Fails safe: catching any DB/network issue and logging a warning without throwing,
   * guaranteeing zero interruption to the user's primary operation.
   */
  async record(params: RecordActivityLogParams) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          actorUserId: params.actorUserId || null,
          actorRole: params.actorRole || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          eventId: params.eventId || null,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
          ip: params.ip || null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record activity log for action '${params.action}' on ${params.entityType}:${params.entityId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * List activity logs with role-based scoping and pagination.
   */
  async listLogs(query: ActivityLogQueryDto, user: AuthenticatedUser) {
    if (user.role === Role.STAFF) {
      throw new ForbiddenException(
        'Staf operasional tidak memiliki hak akses untuk melihat log aktivitas.',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

    // Scoping: ADMIN only views logs for their own events or their own actions
    if (user.role === Role.ADMIN) {
      where.OR = [
        { actorUserId: user.id },
        { event: { userId: user.id } },
      ];
    }

    if (query.eventId) {
      where.eventId = query.eventId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const existingOr = where.OR ? [...where.OR] : [];
      where.AND = [
        ...(existingOr.length > 0 ? [{ OR: existingOr }] : []),
        {
          OR: [
            { action: { contains: term } },
            { entityType: { contains: term } },
            { entityId: { contains: term } },
            { event: { title: { contains: term } } },
            { actorUser: { email: { contains: term } } },
          ],
        },
      ];
      delete where.OR;
    }

    const [total, logs] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Cleanup logs older than retention period (default: 180 days).
   * Safe and idempotent.
   */
  async cleanupOldLogs(retentionDays = 180) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }
}


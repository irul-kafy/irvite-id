import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

@Controller(['api/v1/activity-logs', 'activity-logs'])
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  listLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ActivityLogQueryDto,
  ) {
    return this.activityLogsService.listLogs(query, user);
  }

  /**
   * Cron endpoint to purge activity logs older than retention period (180 days).
   * Protected with CRON_SECRET.
   */
  @Public()
  @Post('cron/cleanup')
  async cleanupOldLogs(
    @Headers('authorization') authHeader?: string,
    @Headers('x-cron-secret') cronSecretHeader?: string,
  ) {
    const configuredSecret = process.env.CRON_SECRET || 'irvite-cron-default-secret';
    const bearerSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const providedSecret = cronSecretHeader?.trim() || bearerSecret;

    if (!providedSecret || providedSecret !== configuredSecret) {
      throw new UnauthorizedException('Invalid or missing cron secret');
    }

    return this.activityLogsService.cleanupOldLogs(180);
  }
}


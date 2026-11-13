import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { AttendanceService } from './attendance.service';
import { ResolveAttendanceDto } from './dto/resolve-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { UndoCheckInDto } from './dto/undo-check-in.dto';
import { WalkInCheckInDto } from './dto/walk-in-check-in.dto';
import { SyncAttendanceBatchDto } from './dto/sync-attendance.dto';
import { GoogleSheetConfigDto } from './dto/google-sheet-config.dto';
import { ExportQueryDto } from '../reports/dto/export-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from 'database';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@Controller(['api/v1/events/:eventId/attendance', 'events/:eventId/attendance'])
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  getLiveAttendance(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getLiveAttendance(
      eventId,
      user.id,
      user.role,
    );
  }

  @Get('google-sheet')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @Header('Cache-Control', 'no-store')
  getGoogleSheetConfig(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getGoogleSheetConfig(
      eventId,
      user.id,
      user.role,
    );
  }

  @Post('google-sheet')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  updateGoogleSheetConfig(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GoogleSheetConfigDto,
  ) {
    return this.attendanceService.updateGoogleSheetConfig(
      eventId,
      user.id,
      user.role,
      dto.webhookUrl,
    );
  }

  @Post('google-sheet/test')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  testGoogleSheetWebhook(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.testGoogleSheetWebhook(
      eventId,
      user.id,
      user.role,
    );
  }

  @Post('google-sheet/resync')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resyncGoogleSheet(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.resyncGoogleSheet(
      eventId,
      user.id,
      user.role,
    );
  }

  @Get('report')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Header('Cache-Control', 'no-store')
  async report(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } =
      await this.attendanceService.exportAttendanceReport(
        eventId,
        user.id,
        user.role,
        query,
      );

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  @Post('resolve')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resolve(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveAttendanceDto,
  ) {
    return this.attendanceService.resolve(
      eventId,
      user.id,
      user.role,
      dto.code,
    );
  }

  @Post('check-in')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  checkIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(
      eventId,
      user.id,
      user.role,
      dto.code,
      dto.pax,
    );
  }

  @Post('walk-in')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  walkInCheckIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WalkInCheckInDto,
  ) {
    return this.attendanceService.walkInCheckIn(
      eventId,
      user.id,
      user.role,
      dto,
    );
  }

  @Post('undo')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  undoCheckIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UndoCheckInDto,
  ) {
    return this.attendanceService.undoCheckIn(
      eventId,
      user.id,
      user.role,
      dto.code,
      dto.invitationId,
      dto.guestId,
    );
  }

  @Get('offline-snapshot')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  getOfflineSnapshot(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.getOfflineSnapshot(
      eventId,
      user.id,
      user.role,
    );
  }

  @Post('sync')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  syncAttendance(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncAttendanceBatchDto,
  ) {
    return this.attendanceService.syncAttendance(
      eventId,
      user.id,
      user.role,
      dto,
    );
  }
}

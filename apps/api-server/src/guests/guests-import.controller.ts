import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GuestsImportService } from './guests-import.service';
import { GoogleSheetImportDto } from './dto/google-sheet-import.dto';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { ImportReportDto } from './dto/import-report.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Role } from 'database';

@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('events/:eventId/guests/import')
export class GuestsImportController {
  constructor(private readonly importService: GuestsImportService) {}

  @Post('file/preview')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    }),
  )
  async previewFile(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Berkas tidak ditemukan. Harap unggah berkas .xlsx atau .csv.',
      );
    }
    return this.importService.previewFile(
      eventId,
      user.id,
      user.role,
      file.buffer,
      file.originalname,
    );
  }

  @Post('sheets/preview')
  async previewSheets(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GoogleSheetImportDto,
  ) {
    return this.importService.previewSheets(
      eventId,
      user.id,
      user.role,
      dto.sheetUrl,
    );
  }

  @Post('confirm')
  async confirm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmImportDto,
  ) {
    return this.importService.confirmImport(eventId, user.id, user.role, dto);
  }

  @Get('template')
  async getTemplate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    await this.importService.assertEventAccessible(eventId, user.id, user.role);
    const buffer = await this.importService.getTemplateBuffer();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_data_tamu.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('report')
  async getReport(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportReportDto,
    @Res() res: Response,
  ) {
    await this.importService.assertEventAccessible(eventId, user.id, user.role);
    const buffer = await this.importService.getReportBuffer(dto);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `laporan_import_tamu_${dateStr}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

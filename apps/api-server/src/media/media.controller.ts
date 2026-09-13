import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
  UseGuards,
  Query,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller(['api/v1/events/:eventId/media', 'events/:eventId/media'])
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':mediaId/file')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async previewFile(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.previewFile(eventId, mediaId, user.id, user.role);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  async create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.mediaService.create(eventId, dto, file, user.id, user.role);
  }

  @Get()
  async findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.findAll(eventId, query, user.id, user.role);
  }

  @Get(':mediaId')
  async findOne(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.findOne(eventId, mediaId, user.id, user.role);
  }

  @Patch(':mediaId')
  async update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.update(eventId, mediaId, dto, user.id, user.role);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.mediaService.remove(eventId, mediaId, user.id, user.role);
  }
}

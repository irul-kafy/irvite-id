import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  Res,
  Header,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from 'database';

@Controller(['api/v1/templates', 'templates'])
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Roles(Role.SUPER_ADMIN)
  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('package')
  @UseInterceptors(
    AnyFilesInterceptor({
      limits: {
        files: 12,
        fileSize: 10 * 1024 * 1024,
        fields: 2,
        fieldSize: 64 * 1024,
        parts: 14,
      },
    }),
  )
  importPackage(
    @Body('manifest') manifest: string,
    @Body('assets') assets: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.templatesService.importPackage(manifest, assets, files);
  }

  @Public()
  @Get('assets/:assetId/file')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async getAssetFile(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Res() response: Response,
  ) {
    const asset = await this.templatesService.getAssetFile(assetId);
    response.type(asset.mimeType);
    response.setHeader('Content-Length', String(asset.size));
    asset.stream.once('error', () => response.destroy());
    return asset.stream.pipe(response);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.templatesService.findAll(query);
  }

  @Public()
  @Get('public/packages')
  getPublicPackages() {
    return this.templatesService.getPublicPackages();
  }

  @Public()
  @Get('public/packages/:id')
  getPublicPackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.getPublicPackage(id);
  }

  @Public()
  @Get('public/availability')
  getPublicAvailability() {
    return this.templatesService.getPublicAvailability();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id/permanent')
  permanentDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.permanentDelete(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id/definition')
  getDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.getDefinition(id);
  }
}

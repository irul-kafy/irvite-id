import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { validateTemplateConfig } from './utils/config-validator';
import { getTemplateDefinition } from './definitions';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.template.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async create(createTemplateDto: CreateTemplateDto) {
    if (createTemplateDto.config) {
      validateTemplateConfig(createTemplateDto.config);
    }

    const newTemplate = await this.prisma.template.create({
      data: {
        name: createTemplateDto.name,
        themeCode: createTemplateDto.themeCode,
        config: createTemplateDto.config
          ? (createTemplateDto.config as object)
          : undefined,
        previewImageUrl: createTemplateDto.previewImageUrl,
      },
    });

    return newTemplate;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    // Check if exists
    await this.findOne(id);

    const data: import('@prisma/client').Prisma.TemplateUpdateInput = {
      name: updateTemplateDto.name,
      themeCode: updateTemplateDto.themeCode,
      previewImageUrl: updateTemplateDto.previewImageUrl,
      status: updateTemplateDto.status,
    };
    if (updateTemplateDto.config !== undefined) {
      validateTemplateConfig(updateTemplateDto.config);
      data.config = updateTemplateDto.config as object;
    }

    const updatedTemplate = await this.prisma.template.update({
      where: { id },
      data,
    });

    return updatedTemplate;
  }

  async getDefinition(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true, themeCode: true },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const definition = getTemplateDefinition(template.themeCode);
    if (!definition) {
      throw new NotFoundException(
        `No structured definition found for template theme "${template.themeCode}"`,
      );
    }

    return {
      templateId: template.id,
      themeCode: definition.themeCode,
      schemaVersion: definition.schemaVersion,
      contentFields: definition.contentFields,
      mediaSlots: definition.mediaSlots,
    };
  }

  async getPublicAvailability() {
    return this.prisma.template.findMany({
      select: {
        themeCode: true,
        status: true,
      },
      orderBy: { themeCode: 'asc' },
    });
  }
}

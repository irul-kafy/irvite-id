import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { validateTemplateConfig } from './utils/config-validator';
import { getTemplateDefinition } from './definitions';
import { TEMPLATE_STATUS } from './template-status';
import { isBuiltInTemplate } from './sync-templates';
import { Prisma } from 'database';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [rawTemplates, total] = await Promise.all([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { events: true },
          },
        },
      }),
      this.prisma.template.count(),
    ]);

    const data = rawTemplates.map(({ _count, ...rest }) => ({
      ...rest,
      eventUsageCount: _count?.events ?? 0,
    }));

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
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const { _count, ...rest } = template;
    return {
      ...rest,
      eventUsageCount: _count?.events ?? 0,
    };
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

  async permanentDelete(id: string) {
    // 1. find template
    const template = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        themeCode: true,
        status: true,
      },
    });

    // 2. 404 if missing
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    // 3. reject built-in template with ConflictException (409)
    if (isBuiltInTemplate(template.themeCode)) {
      throw new ConflictException(
        'Built-in system templates cannot be permanently deleted. Archive the template instead.',
      );
    }

    // 4. require status === ARCHIVED
    if (template.status !== TEMPLATE_STATUS.ARCHIVED) {
      throw new BadRequestException(
        `Only archived templates can be permanently deleted. Current status is ${template.status}. Archive the template first.`,
      );
    }

    // 5. count Event references
    const eventUsageCount = await this.prisma.event.count({
      where: { templateId: id },
    });

    // 6. if count > 0 -> ConflictException (409)
    if (eventUsageCount > 0) {
      throw new ConflictException(
        `Cannot delete template: it is referenced by ${eventUsageCount} event(s). Templates with event references cannot be permanently deleted.`,
      );
    }

    // 7. delete template
    try {
      await this.prisma.template.delete({
        where: { id },
      });

      return {
        status: 'success',
        message: `Template "${template.name}" permanently deleted successfully`,
        data: {
          id: template.id,
          name: template.name,
          themeCode: template.themeCode,
        },
      };
    } catch (error: unknown) {
      if (
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003') ||
        (error &&
          typeof error === 'object' &&
          (error as { code?: string }).code === 'P2003')
      ) {
        throw new ConflictException(
          'Cannot delete template: it is referenced by one or more events.',
        );
      }
      throw error;
    }
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

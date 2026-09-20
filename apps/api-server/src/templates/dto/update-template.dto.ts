import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateConfigDto } from './template-config.dto';
import { VALID_TEMPLATE_STATUSES } from '../template-status';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  themeCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  config?: TemplateConfigDto;

  @IsOptional()
  @IsUrl()
  previewImageUrl?: string;

  @IsOptional()
  @IsIn(VALID_TEMPLATE_STATUSES, {
    message: 'status must be one of: AVAILABLE, HIDDEN, ARCHIVED',
  })
  status?: string;
}

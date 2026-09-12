import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateConfigDto } from './template-config.dto';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  themeCode: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateConfigDto)
  config?: TemplateConfigDto;

  @IsOptional()
  @IsUrl()
  previewImageUrl?: string;
}

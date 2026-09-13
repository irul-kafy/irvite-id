import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIn,
  ValidateIf,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventContentDto } from './event-content.dto';
import { EVENT_STATUS } from '../event-status';

export class UpdateEventDto {
  @ValidateIf((o: UpdateEventDto) => o.content !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => EventContentDto)
  content?: EventContentDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  locationDetails?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ValidateIf((o: UpdateEventDto) => o.status !== undefined)
  @IsIn([EVENT_STATUS.DRAFT, EVENT_STATUS.PUBLISHED])
  status?: string;
}

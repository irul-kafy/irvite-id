import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { EVENT_STATUS } from '../event-status';

export class UpdateEventDto {
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

  @IsOptional()
  content?: unknown;

  @ValidateIf((o: UpdateEventDto) => o.status !== undefined)
  @IsIn([EVENT_STATUS.DRAFT, EVENT_STATUS.PUBLISHED])
  status?: string;
}

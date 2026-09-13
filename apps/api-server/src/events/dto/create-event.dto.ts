import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventContentDto } from './event-content.dto';

export class CreateEventDto {
  @ValidateIf((o: CreateEventDto) => o.content !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => EventContentDto)
  content?: EventContentDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @IsOptional()
  @IsString()
  locationDetails?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}

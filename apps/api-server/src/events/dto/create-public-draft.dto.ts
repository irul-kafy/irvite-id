import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export interface PublicDraftPhotoInput {
  slot: string;
  dataUrl: string;
  order?: number;
}

export class CreatePublicDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  themeCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  clientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  clientWhatsapp: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clientNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationDetails?: string;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  photos?: PublicDraftPhotoInput[];
}


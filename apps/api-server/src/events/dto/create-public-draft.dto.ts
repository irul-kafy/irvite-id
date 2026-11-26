import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CAPACITY_TIERS, SELECTABLE_PACKAGE_CODES } from 'pricing';

export interface PublicDraftPhotoInput {
  slot: string;
  dataUrl: string;
  order?: number;
}

export const PUBLIC_DRAFT_PACKAGE_CODES = [
  ...SELECTABLE_PACKAGE_CODES,
  'UNSELECTED',
] as const;
export type PublicDraftPackageCode =
  (typeof PUBLIC_DRAFT_PACKAGE_CODES)[number];

export class PublicDraftOrderOptionsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  extraPetugas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  extraHoursPerPetugas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  supervisor?: number;

  @IsOptional()
  @IsBoolean()
  akrilik?: boolean;

  @IsOptional()
  @IsBoolean()
  gladi?: boolean;

  @IsOptional()
  @IsInt()
  @IsIn([...CAPACITY_TIERS])
  capacityTier?: (typeof CAPACITY_TIERS)[number];
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
  @IsString()
  @IsIn([...PUBLIC_DRAFT_PACKAGE_CODES])
  packageCode?: PublicDraftPackageCode;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicDraftOrderOptionsDto)
  options?: PublicDraftOrderOptionsDto;

  @IsOptional()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  photos?: PublicDraftPhotoInput[];
}

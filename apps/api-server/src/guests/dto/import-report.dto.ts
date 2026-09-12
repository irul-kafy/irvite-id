import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportReportRowDto {
  @IsInt()
  sourceRow: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string | null;

  @IsOptional()
  @IsInt()
  maxPax?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  canonicalUrl?: string | null;
}

export class ImportReportDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportReportRowDto)
  rows: ImportReportRowDto[];
}

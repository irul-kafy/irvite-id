import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConfirmImportRowDto {
  @IsInt()
  sourceRow: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string | null;

  @IsOptional()
  email?: string | null;

  @IsOptional()
  maxPax?: number | null;

  @IsOptional()
  @IsBoolean()
  importAnyway?: boolean;
}

export class ConfirmImportDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ConfirmImportRowDto)
  rows: ConfirmImportRowDto[];
}

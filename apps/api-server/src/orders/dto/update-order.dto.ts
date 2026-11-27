import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from 'database';
import { CAPACITY_TIERS } from 'pricing';

export class UpdateOrderOptionsDto {
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

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  packageCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrderOptionsDto)
  options?: UpdateOrderOptionsDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  paymentProofMediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  activeUntil?: string;
}

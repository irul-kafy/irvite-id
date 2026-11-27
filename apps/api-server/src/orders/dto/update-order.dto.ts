import { Type } from 'class-transformer';
import {
  IsArray,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from 'database';
import { CAPACITY_TIERS } from 'pricing';

export class UpdateOrderOptionsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  extraPetugas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
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

export class CustomServiceUnitPricesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  petugasUnit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  petugasExtraHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  supervisor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  akrilik?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gladi?: number;
}

export class CustomExtraLineItemDto {
  @IsString()
  @MaxLength(160)
  label!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @IsInt()
  @Min(0)
  unitPrice!: number;
}

export class SuperAdminEntitlementsOverrideDto {
  @IsOptional()
  @IsBoolean()
  googleSheetLive?: boolean;

  @IsOptional()
  @IsBoolean()
  postEventReport?: boolean;

  @IsOptional()
  @IsBoolean()
  akrilikQris?: boolean;

  @IsOptional()
  @IsBoolean()
  gladiH1?: boolean;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  supervisorCount?: 0 | 1;
}

export class SuperAdminCustomOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customPackageName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  customMaxGuests?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  extraPetugas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  extraHoursPerPetugas?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomServiceUnitPricesDto)
  unitPrices?: CustomServiceUnitPricesDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomExtraLineItemDto)
  customLineItems?: CustomExtraLineItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SuperAdminEntitlementsOverrideDto)
  entitlements?: SuperAdminEntitlementsOverrideDto;

  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @IsInt()
  @Min(0)
  originalPriceAmount?: number | null;
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
  @ValidateIf((_, val) => val !== null)
  @ValidateNested()
  @Type(() => SuperAdminCustomOrderDto)
  superAdminCustom?: SuperAdminCustomOrderDto | null;

  @IsOptional()
  @ValidateIf((_, val) => val !== null)
  @IsInt()
  @Min(0)
  originalPriceAmount?: number | null;

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

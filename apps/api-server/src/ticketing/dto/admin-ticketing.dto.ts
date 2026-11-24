import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateTicketTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quota!: number;

  @IsOptional()
  @IsDateString()
  salesStartAt?: string;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateTicketTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quota?: number;

  @IsOptional()
  @IsDateString()
  salesStartAt?: string;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateTicketingEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(191)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizerName?: string;

  @IsOptional()
  @IsString()
  eventDate?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  venue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  venueName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationDetails?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  taxRatePercent?: number;

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  serviceFeeBps?: number;

  @IsOptional()
  @IsIn(['BUYER', 'ORGANIZER'])
  feePayer?: 'BUYER' | 'ORGANIZER';

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  promoFeeBps?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  promoEndsAt?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'REVIEW', 'PUBLISHED', 'ENDED', 'CANCELLED'])
  ticketStatus?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ENDED' | 'CANCELLED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTierDto)
  tiers?: CreateTicketTierDto[];
}

export class UpdateTicketingEventDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(191)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizerName?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  venue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  taxRatePercent?: number;

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  serviceFeeBps?: number;

  @IsOptional()
  @IsIn(['BUYER', 'ORGANIZER'])
  feePayer?: 'BUYER' | 'ORGANIZER';

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  promoFeeBps?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  promoEndsAt?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'REVIEW', 'PUBLISHED', 'ENDED', 'CANCELLED'])
  ticketStatus?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ENDED' | 'CANCELLED';
}

export class ListEventOrdersQueryDto {
  @IsOptional()
  @IsIn([
    'PENDING',
    'PAID',
    'EXPIRED',
    'CANCELLED',
    'REFUNDED',
    'REFUND_PENDING',
  ])
  status?:
    | 'PENDING'
    | 'PAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'REFUND_PENDING';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CheckInTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'ID acara (eventId) wajib diisi.' })
  @MaxLength(191)
  eventId!: string;

  @IsOptional()
  @IsString()
  qrPayload?: string;

  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  qrDigest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ticketCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  gateName?: string;
}

export class UndoTicketCheckInDto {
  @IsString()
  @IsNotEmpty({ message: 'ID acara (eventId) wajib diisi.' })
  @MaxLength(191)
  eventId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  ticketId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ticketCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'Alasan pembatalan check-in wajib diisi.' })
  @MinLength(3, { message: 'Alasan pembatalan minimal 3 karakter.' })
  @MaxLength(300)
  reason!: string;
}

export class SearchEventTicketsQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Kata kunci pencarian (q) wajib diisi.' })
  @MinLength(1)
  @MaxLength(120)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export class OfflineTicketCheckInOpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  opId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  ticketId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ticketCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  qrDigest?: string;

  @IsOptional()
  @IsString()
  qrPayload?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  gateName?: string;

  @IsOptional()
  @IsDateString()
  scannedAt?: string;
}

export class SyncOfflineTicketCheckInsDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  deviceId?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OfflineTicketCheckInOpDto)
  operations!: OfflineTicketCheckInOpDto[];
}

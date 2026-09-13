import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Explicit hosts and paths prevent lookalike domains and non-HTTPS links.
export const GOOGLE_MAPS_URL =
  /^https:\/\/(?:(?:www\.)?google\.com\/maps(?:[/?#]|$)|maps\.google\.com(?:[/?#]|$)|maps\.app\.goo\.gl\/|goo\.gl\/maps(?:[/?#]|$))[^\s]*$/i;

export class CeremonyDto {
  @IsString() @MaxLength(80) title: string;
  @IsDateString() dateTime: string;
  @IsString() @MaxLength(255) venue: string;
  @IsString() @MaxLength(1000) address: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(GOOGLE_MAPS_URL)
  mapsUrl?: string;
}

export class EventContentDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  galleryMediaIds?: string[];
  @IsOptional() @IsString() @MaxLength(120) partnerOneName?: string;
  @IsOptional() @IsString() @MaxLength(120) partnerTwoName?: string;
  @IsOptional() @IsString() @MaxLength(250) partnerOneParents?: string;
  @IsOptional() @IsString() @MaxLength(250) partnerTwoParents?: string;
  @IsOptional() @IsString() @MaxLength(2000) openingText?: string;
  @IsOptional() @IsString() @MaxLength(2000) prayerText?: string;
  @IsOptional() @IsString() @MaxLength(2000) closingText?: string;
  @IsOptional() @IsString() @MaxLength(120) prayerSource?: string;
  @IsOptional() @IsString() @MaxLength(80) giftTitle?: string;
  @IsOptional() @IsString() @MaxLength(120) giftAccountName?: string;
  @IsOptional() @IsString() @MaxLength(1000) giftMessage?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(GOOGLE_MAPS_URL)
  mapsUrl?: string;
  @IsOptional()
  @IsIn(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'])
  timeZone?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CeremonyDto)
  ceremonies?: CeremonyDto[];
  @IsOptional() @IsUUID() giftQrMediaId?: string;
}

import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const EO_INQUIRY_STATUS_VALUES = [
  'PENDING',
  'REVIEWED',
  'NEED_INFO',
  'APPROVED',
  'REJECTED',
] as const;

export type EoInquiryStatusValue = (typeof EO_INQUIRY_STATUS_VALUES)[number];

export class CreateEoInquiryDto {
  @IsString({ message: 'Nama penyelenggara wajib berupa teks.' })
  @IsNotEmpty({ message: 'Nama penyelenggara wajib diisi.' })
  @MinLength(2, { message: 'Nama penyelenggara minimal 2 karakter.' })
  @MaxLength(150, { message: 'Nama penyelenggara maksimal 150 karakter.' })
  organizerName!: string;

  @IsString({ message: 'Nama acara wajib berupa teks.' })
  @IsNotEmpty({ message: 'Nama acara wajib diisi.' })
  @MinLength(3, { message: 'Nama acara minimal 3 karakter.' })
  @MaxLength(191, { message: 'Nama acara maksimal 191 karakter.' })
  eventName!: string;

  @IsString({ message: 'Kategori acara wajib berupa teks.' })
  @IsNotEmpty({ message: 'Kategori acara wajib dipilih.' })
  @MaxLength(80, { message: 'Kategori acara maksimal 80 karakter.' })
  category!: string;

  @IsString({ message: 'Estimasi jumlah penonton wajib berupa teks.' })
  @IsNotEmpty({ message: 'Estimasi jumlah penonton wajib dipilih.' })
  @MaxLength(80, { message: 'Estimasi jumlah penonton maksimal 80 karakter.' })
  estimatedAudience!: string;

  @IsString({ message: 'Nama penanggung jawab wajib berupa teks.' })
  @IsNotEmpty({ message: 'Nama penanggung jawab wajib diisi.' })
  @MinLength(2, { message: 'Nama penanggung jawab minimal 2 karakter.' })
  @MaxLength(150, { message: 'Nama penanggung jawab maksimal 150 karakter.' })
  contactName!: string;

  @IsOptional()
  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsEmail({}, { message: 'Format alamat email penanggung jawab tidak valid.' })
  @MaxLength(191)
  contactEmail?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp penanggung jawab wajib diisi.' })
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, {
    message:
      'Format nomor WhatsApp Indonesia tidak valid (contoh: 081234567890).',
  })
  contactWhatsapp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Catatan pengajuan maksimal 1000 karakter.',
  })
  notes?: string;

  /**
   * Honeypot field: must remain empty for legitimate users.
   * If filled, service returns a fake 200 success response without persisting anything.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}

export class ListEoInquiriesQueryDto {
  @IsOptional()
  @IsIn(EO_INQUIRY_STATUS_VALUES, {
    message: 'Filter status pengajuan EO tidak valid.',
  })
  status?: EoInquiryStatusValue;

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

export class UpdateEoInquiryStatusDto {
  @IsString()
  @IsIn(EO_INQUIRY_STATUS_VALUES, {
    message: 'Status pengajuan EO tidak valid.',
  })
  status!: EoInquiryStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Catatan tinjauan admin maksimal 2000 karakter.',
  })
  adminNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: 'Catatan tinjauan admin maksimal 2000 karakter.',
  })
  notes?: string;
}

export class VerifyOrderAccessTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  accessToken?: string;
}

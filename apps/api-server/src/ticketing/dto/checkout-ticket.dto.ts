import { Type } from 'class-transformer';
import {
  IsArray,
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
} from 'class-validator';

export class QuoteTicketOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Kategori tiket wajib dipilih.' })
  tierId!: string;

  @Type(() => Number)
  @IsInt({ message: 'Jumlah tiket harus berupa bilangan bulat.' })
  @Min(1, { message: 'Jumlah pembelian minimal 1 tiket.' })
  @Max(50, { message: 'Jumlah pembelian melebihi batas maksimum.' })
  quantity!: number;
}

export class CheckoutTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Slug acara wajib diisi.' })
  eventSlug!: string;

  @IsString()
  @IsNotEmpty({ message: 'Kategori tiket wajib dipilih.' })
  tierId!: string;

  @Type(() => Number)
  @IsInt({ message: 'Jumlah tiket harus berupa bilangan bulat.' })
  @Min(1, { message: 'Jumlah pembelian minimal 1 tiket.' })
  @Max(50, { message: 'Jumlah pembelian melebihi batas maksimum.' })
  quantity!: number;

  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap pemesan wajib diisi.' })
  @MinLength(2, { message: 'Nama lengkap pemesan minimal 2 karakter.' })
  @MaxLength(150)
  buyerName!: string;

  @IsEmail({}, { message: 'Format alamat email pemesan tidak valid.' })
  @MaxLength(191)
  buyerEmail!: string;

  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,11}$/, {
    message:
      'Format nomor WhatsApp Indonesia tidak valid (contoh: 081234567890).',
  })
  buyerWhatsapp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holderNames?: string[];
}

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  orderCode!: string;

  @IsString()
  @IsIn(['PAID', 'SETTLEMENT', 'EXPIRED', 'CANCELLED'])
  transactionStatus!: 'PAID' | 'SETTLEMENT' | 'EXPIRED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  grossAmount?: number;
}

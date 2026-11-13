import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceCode?: string;

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
  @MaxLength(40)
  packageCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}


import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateGuestDto {
  @ValidateIf((object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  customGreeting?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @ValidateIf((object, value) => value !== undefined)
  @IsString()
  category?: string;

  @ValidateIf((object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  maxPax?: number;
}

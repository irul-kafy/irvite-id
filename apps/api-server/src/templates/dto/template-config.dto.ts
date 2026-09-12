import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsString,
  Matches,
  ValidateNested,
  ArrayMaxSize,
  Equals,
} from 'class-validator';

export enum FontEnum {
  INTER = 'INTER',
  PLAYFAIR_DISPLAY = 'PLAYFAIR_DISPLAY',
  LORA = 'LORA',
  MONTSERRAT = 'MONTSERRAT',
}

export enum SectionIdEnum {
  hero = 'hero',
  greeting = 'greeting',
  eventDetails = 'eventDetails',
  countdown = 'countdown',
  gallery = 'gallery',
  location = 'location',
  rsvp = 'rsvp',
  guestQr = 'guestQr',
  closing = 'closing',
}

export enum SectionVariantEnum {
  default = 'default',
}

export class ThemeConfigDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid 6-digit hex code, e.g., #111827',
  })
  primaryColor: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondaryColor: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  backgroundColor: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  textColor: string;
}

export class TypographyConfigDto {
  @IsEnum(FontEnum)
  headingFont: FontEnum;

  @IsEnum(FontEnum)
  bodyFont: FontEnum;
}

export class SectionConfigDto {
  @IsEnum(SectionIdEnum)
  id: SectionIdEnum;

  @IsBoolean()
  enabled: boolean;

  @IsInt()
  order: number;

  @IsEnum(SectionVariantEnum)
  variant: SectionVariantEnum;
}

export class TemplateConfigDto {
  @IsInt()
  @Equals(1)
  version: number;

  @ValidateNested()
  @Type(() => ThemeConfigDto)
  theme: ThemeConfigDto;

  @ValidateNested()
  @Type(() => TypographyConfigDto)
  typography: TypographyConfigDto;

  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => SectionConfigDto)
  sections: SectionConfigDto[];
}

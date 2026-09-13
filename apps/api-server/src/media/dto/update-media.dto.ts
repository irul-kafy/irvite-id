import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { SLOT_REGEX } from './create-media.dto';

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(SLOT_REGEX, {
    message:
      'slot must start with a lowercase letter and contain only lowercase alphanumeric characters and hyphens (max 50 chars)',
  })
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  slot?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0) {
        throw new BadRequestException('order must be a non-negative integer');
      }
      return value;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('order must be a non-negative integer');
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new BadRequestException('order must be a non-negative integer');
    }
    return num;
  })
  order?: number;
}

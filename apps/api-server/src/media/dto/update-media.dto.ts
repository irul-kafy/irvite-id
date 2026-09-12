import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

export class UpdateMediaDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0) {
        throw new BadRequestException('order must be a non‑negative integer');
      }
      return value;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException('order must be a non‑negative integer');
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new BadRequestException('order must be a non‑negative integer');
    }
    return num;
  })
  order?: number;
}

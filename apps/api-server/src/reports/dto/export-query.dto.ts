import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExportQueryDto {
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: 'xlsx' | 'csv' = 'xlsx';

  @IsOptional()
  @IsIn(['all', 'yes', 'no', 'pending'])
  rsvp?: 'all' | 'yes' | 'no' | 'pending' = 'all';

  @IsOptional()
  @IsIn(['all', 'checked-in', 'not-checked-in'])
  attendance?: 'all' | 'checked-in' | 'not-checked-in' = 'all';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }): string | undefined =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  category?: string;
}

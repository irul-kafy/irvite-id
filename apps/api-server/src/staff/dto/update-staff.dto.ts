import { IsBoolean, IsEmail, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateStaffDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

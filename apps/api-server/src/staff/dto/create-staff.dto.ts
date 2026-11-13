import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from 'database';

export class CreateStaffDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(12)
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsIn([Role.ADMIN, Role.STAFF])
  role?: Role;
}

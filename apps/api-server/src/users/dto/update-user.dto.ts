import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Role } from 'database';

export class UpdateUserDto {
  @IsOptional()
  @IsIn([Role.ADMIN, Role.STAFF])
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

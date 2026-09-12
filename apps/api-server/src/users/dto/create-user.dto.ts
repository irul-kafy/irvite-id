import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'database';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(12)
  @IsNotEmpty()
  password: string;

  @IsIn([Role.ADMIN, Role.STAFF])
  role: Role;
}

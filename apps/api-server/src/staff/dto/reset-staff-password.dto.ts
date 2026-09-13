import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetStaffPasswordDto {
  @IsString()
  @MinLength(12)
  @IsNotEmpty()
  password: string;
}

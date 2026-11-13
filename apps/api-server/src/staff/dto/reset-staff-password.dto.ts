import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetStaffPasswordDto {
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}

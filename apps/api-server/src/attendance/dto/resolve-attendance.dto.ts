import { IsString, Matches } from 'class-validator';

export class ResolveAttendanceDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{22}$/, {
    message: 'code must be a 22-character valid uniqueCode',
  })
  code: string;
}

import { IsString, Matches, IsInt, Min } from 'class-validator';

export class CheckInDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{22}$/, {
    message: 'code must be a 22-character valid uniqueCode',
  })
  code: string;

  @IsInt()
  @Min(1)
  pax: number;
}

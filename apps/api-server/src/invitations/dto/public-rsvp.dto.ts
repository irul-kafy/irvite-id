import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class PublicRsvpDto {
  @IsIn(['YES', 'NO'])
  response: 'YES' | 'NO';

  @IsOptional()
  @IsInt()
  @Min(1)
  pax?: number;
}

import { IsString, IsOptional, MaxLength } from 'class-validator';

export class GoogleSheetConfigDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  webhookUrl?: string;
}

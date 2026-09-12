import { IsOptional, IsString } from 'class-validator';

export class CreateInvitationDto {
  @IsOptional()
  @IsString()
  customMessage?: string | null;
}

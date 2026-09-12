import { IsOptional, IsString } from 'class-validator';

export class UpdateInvitationDto {
  @IsOptional()
  @IsString()
  customMessage?: string | null;
}

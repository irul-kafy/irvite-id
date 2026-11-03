import { IsString, IsOptional, Matches, IsUUID } from 'class-validator';

export class UndoCheckInDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{22}$/, {
    message: 'code must be a 22-character valid uniqueCode',
  })
  code?: string;

  @IsOptional()
  @IsUUID()
  invitationId?: string;

  @IsOptional()
  @IsUUID()
  guestId?: string;
}


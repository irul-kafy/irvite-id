import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class CreatePortalGuestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  customGreeting?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxPax?: number;

  @IsOptional()
  @IsString()
  tableNumber?: string | null;
}

export class UpdatePortalGuestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  customGreeting?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxPax?: number;

  @IsOptional()
  @IsString()
  tableNumber?: string | null;
}

export class SetPortalWaStatusDto {
  @IsBoolean()
  isSent: boolean;
}

export class StartPortalWaQueueDto {
  @IsNotEmpty()
  targetGuestIds: string[];

  @IsOptional()
  @IsString()
  pacing?: 'relaxed' | 'standard' | 'fast';

  @IsOptional()
  @IsBoolean()
  useSpintax?: boolean;

  @IsOptional()
  @IsBoolean()
  enableBatchBreak?: boolean;

  @IsOptional()
  @IsString()
  originUrl?: string;
}

export class ControlPortalWaQueueDto {
  @IsString()
  @IsNotEmpty()
  action: 'pause' | 'resume' | 'stop';
}

export class SendPortalWaTestDto {
  @IsString()
  @IsNotEmpty()
  targetPhone: string;

  @IsOptional()
  @IsString()
  testMessage?: string;
}

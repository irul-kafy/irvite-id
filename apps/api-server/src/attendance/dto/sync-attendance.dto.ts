import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OfflineWalkInPayloadDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pax?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;
}

export class OfflineSyncOperationItemDto {
  @IsNotEmpty()
  @IsString()
  opId: string;

  @IsNotEmpty()
  @IsIn(['CHECK_IN', 'WALK_IN', 'UNDO'])
  type: 'CHECK_IN' | 'WALK_IN' | 'UNDO';

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pax?: number;

  @IsOptional()
  @IsString()
  guestId?: string;

  @IsOptional()
  @IsString()
  invitationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OfflineWalkInPayloadDto)
  walkInData?: OfflineWalkInPayloadDto;

  @IsNotEmpty()
  @IsString()
  clientTimestamp: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SyncAttendanceBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineSyncOperationItemDto)
  operations: OfflineSyncOperationItemDto[];
}


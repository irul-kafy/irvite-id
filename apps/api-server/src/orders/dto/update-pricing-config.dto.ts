import { IsObject } from 'class-validator';

export class UpdateMasterPricingConfigDto {
  @IsObject()
  config!: Record<string, unknown>;
}

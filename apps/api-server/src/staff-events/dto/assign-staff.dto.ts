import { IsUUID } from 'class-validator';

export class AssignStaffDto {
  @IsUUID(4)
  userId: string;
}

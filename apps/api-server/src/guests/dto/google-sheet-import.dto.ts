import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSheetImportDto {
  @IsString()
  @IsNotEmpty()
  sheetUrl: string;
}

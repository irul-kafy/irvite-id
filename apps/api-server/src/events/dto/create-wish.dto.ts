import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWishDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama pengirim doa wajib diisi' })
  @MaxLength(120, { message: 'Nama maksimal 120 karakter' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Pesan ucapan dan doa wajib diisi' })
  @MaxLength(500, { message: 'Pesan ucapan maksimal 500 karakter' })
  message: string;
}

import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Must be a valid email' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsString()
  @Matches(/^\d{9}$/, { message: 'Cédula must be exactly 9 digits' })
  cedula: string;

  @IsString()
  @MinLength(8, { message: 'El teléfono debe tener al menos 8 dígitos' })
  phone: string;
}
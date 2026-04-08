import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

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

  @IsOptional()
  @IsString()
  phone?: string;
}
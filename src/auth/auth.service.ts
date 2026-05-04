import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { CedulaService } from '../cedula/cedula.service';
import { EmailService } from '../email/email.service';
import { UserStatus } from '../users/user.schema';
import type { UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cedulaService: CedulaService,
    private emailService: EmailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // 1. Validar cédula en el padrón (también valida mayoría de edad)
    await this.cedulaService.validate(createUserDto.cedula);

    // 2. Crear usuario en estado PENDING con token de verificación
    const user = await this.usersService.create(createUserDto);

    // 3. Enviar correo de verificación
    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      user.verificationToken,
    );

    return {
      message:
        'Registro exitoso. Revisá tu correo para activar tu cuenta antes de ingresar.',
      email: user.email,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException(
        'El enlace de verificación es inválido o ya expiró. Registrate de nuevo.',
      );
    }

    await this.usersService.activateUser(user._id.toString());

    // Redirigir al frontend con éxito
    return { success: true, email: user.email };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    // Bloquear login si la cuenta está pendiente de verificación
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Tu cuenta aún no está verificada. Revisá tu correo y hacé click en el enlace de activación.',
      );
    }

    const token = this.generateToken(user._id.toString(), user.email);
    return { user, token };
  }

  async handleGoogleLogin(user: UserDocument) {
    // Usuarios de Google siempre están activos (Google ya verificó el email)
    const token = this.generateToken(user._id.toString(), user.email);
    return { user, token };
  }

  async completeGoogleProfile(userId: string, cedula: string, name: string) {
    await this.cedulaService.validate(cedula);
    const user = await this.usersService.updateCedula(userId, cedula, name);
    return { user };
  }

  private generateToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }
}
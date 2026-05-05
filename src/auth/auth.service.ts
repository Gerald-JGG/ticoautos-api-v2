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
import { SmsService } from '../sms/sms.service';
import { UserStatus } from '../users/user.schema';
import type { UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cedulaService: CedulaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    await this.cedulaService.validate(createUserDto.cedula);
    const user = await this.usersService.create(createUserDto);
    await this.emailService.sendVerificationEmail(
      user.email,
      user.name,
      user.verificationToken,
    );
    return {
      message: 'Registro exitoso. Revisá tu correo para activar tu cuenta.',
      email: user.email,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException(
        'El enlace de verificación es inválido o ya expiró.',
      );
    }
    await this.usersService.activateUser(user._id.toString());
    return { success: true, email: user.email };
  }

  /**
   * Login paso 1: validar credenciales y enviar código 2FA por SMS.
   * NO devuelve el JWT aún — solo un indicador de que se envió el SMS.
   */
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Tu cuenta aún no está verificada. Revisá tu correo y hacé click en el enlace de activación.',
      );
    }

    if (!user.phone) {
      throw new UnauthorizedException(
        'No tenés número de teléfono registrado. Contactá soporte.',
      );
    }

    // Generar código 2FA y enviarlo por SMS
    const code = await this.usersService.generateTwoFactorCode(user._id.toString());
    await this.smsService.sendTwoFactorCode(user.phone, code);

    return {
      requires2FA: true,
      userId: user._id.toString(),
      message: `Código de verificación enviado al número terminado en ${user.phone.slice(-4)}`,
    };
  }

  /**
   * Login paso 2: verificar código 2FA y devolver JWT.
   */
  async verifyTwoFactor(userId: string, code: string) {
    const user = await this.usersService.verifyTwoFactorCode(userId, code);

    if (!user) {
      throw new UnauthorizedException(
        'Código incorrecto o expirado. Intentá iniciar sesión de nuevo.',
      );
    }

    const token = this.generateToken(user._id.toString(), user.email);
    return { user, token };
  }

  async handleGoogleLogin(user: UserDocument) {
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
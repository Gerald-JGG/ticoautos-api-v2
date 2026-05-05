import {
  Controller, Post, Get, Body, Param,
  HttpCode, HttpStatus, UseGuards, Req, Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';
import type { Response } from 'express';
import { IsString, Length } from 'class-validator';

class VerifyTwoFactorDto {
  @IsString()
  userId: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * POST /api/auth/login
   * Paso 1 del 2FA: valida credenciales y envía SMS
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/verify-2fa
   * Paso 2 del 2FA: verifica el código y devuelve el JWT
   */
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() body: VerifyTwoFactorDto) {
    return this.authService.verifyTwoFactor(body.userId, body.code);
  }

  /**
   * GET /api/auth/verify-email/:token
   */
  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.authService.verifyEmail(token);
      return res.redirect(
        `${frontendUrl}/auth/login?verified=true&email=${encodeURIComponent(result.email)}`,
      );
    } catch (error: any) {
      return res.redirect(
        `${frontendUrl}/auth/login?verified=false&error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: UserDocument) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  async completeProfile(
    @CurrentUser() user: UserDocument,
    @Body() body: { cedula: string; name: string },
  ) {
    return this.authService.completeGoogleProfile(user._id.toString(), body.cedula, body.name);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.handleGoogleLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (!req.user.cedula) {
        return res.redirect(`${frontendUrl}/auth/complete-profile?token=${result.token}`);
      }
      return res.redirect(`${frontendUrl}/auth/google/success?token=${result.token}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
    }
  }
}
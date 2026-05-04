import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Registro con email/password — queda en estado PENDING hasta verificar email
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * POST /api/auth/login
   * Login — bloqueado si el usuario está en estado PENDING
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * GET /api/auth/verify-email/:token
   * Activa la cuenta del usuario y redirige al frontend
   */
  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      const result = await this.authService.verifyEmail(token);
      // Redirigir al login con mensaje de éxito
      return res.redirect(
        `${frontendUrl}/auth/login?verified=true&email=${encodeURIComponent(result.email)}`,
      );
    } catch (error: any) {
      // Redirigir al frontend con error
      return res.redirect(
        `${frontendUrl}/auth/login?verified=false&error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * GET /api/auth/me
   * Retorna el usuario autenticado actual
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: UserDocument) {
    return user;
  }

  /**
   * POST /api/auth/complete-profile
   * Completar perfil para usuarios que se registraron con Google
   */
  @UseGuards(JwtAuthGuard)
  @Post('complete-profile')
  async completeProfile(
    @CurrentUser() user: UserDocument,
    @Body() body: { cedula: string; name: string },
  ) {
    return this.authService.completeGoogleProfile(
      user._id.toString(),
      body.cedula,
      body.name,
    );
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
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
        return res.redirect(
          `${frontendUrl}/auth/complete-profile?token=${result.token}`,
        );
      }

      return res.redirect(
        `${frontendUrl}/auth/google/success?token=${result.token}`,
      );
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
    }
  }
}
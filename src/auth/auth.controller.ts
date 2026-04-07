import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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

  // ── Google OAuth ──────────────────────────────────────────────────
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.handleGoogleLogin(req.user);

    // Si no tiene cédula → completar perfil
    if (!req.user.cedula) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/complete-profile?token=${result.token}`
      );
    }

    // Ya tiene cédula → ir al home
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/google/success?token=${result.token}`
    );
  }
}
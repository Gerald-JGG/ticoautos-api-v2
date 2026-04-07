import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class GoogleController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any) {
    const { user, token } = await this.authService.handleGoogleLogin(req.user);

    const needsProfile = !user.cedula;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (needsProfile) {
      return `<script>window.location.href='${frontendUrl}/auth/complete-profile?token=${token}'</script>`;
    }
    return `<script>window.location.href='${frontendUrl}/auth/google/success?token=${token}'</script>`;
  }
}
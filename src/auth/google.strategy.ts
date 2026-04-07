import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { UsersService } from '../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private usersService: UsersService) {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Missing Google OAuth environment variables');
    }

    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'] } as StrategyOptions);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;

    if (!email) throw new Error('No email from Google');

    return this.usersService.findOrCreateGoogle({ googleId, email, name });
  }
}
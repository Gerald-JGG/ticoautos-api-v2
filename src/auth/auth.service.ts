import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { CedulaService } from '../cedula/cedula.service';
import type { UserDocument } from '../users/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cedulaService: CedulaService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    await this.cedulaService.validate(createUserDto.cedula);
    const user = await this.usersService.create(createUserDto);
    const token = this.generateToken(user._id.toString(), user.email);
    return { user, token };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
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
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument, UserStatus } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Verificar email único
    const existingEmail = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Verificar cédula única
    const existingCedula = await this.userModel.findOne({
      cedula: createUserDto.cedula,
    });
    if (existingCedula) {
      throw new ConflictException('La cédula ya está registrada en el sistema');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Generar token de verificación único (64 chars hex)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      status: UserStatus.PENDING,
      verificationToken,
      verificationTokenExpires,
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }, // token no expirado
    });
  }

  async activateUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        status: UserStatus.ACTIVE,
        verificationToken: null,
        verificationTokenExpires: null,
      },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOrCreateGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<UserDocument> {
    // Buscar por googleId
    let user = await this.userModel.findOne({ googleId: profile.googleId });
    if (user) return user;

    // Buscar por email y vincular googleId
    user = await this.userModel.findOne({ email: profile.email });
    if (user) {
      user.googleId = profile.googleId;
      // Si se registró con Google, activar directamente (Google ya verificó el email)
      user.status = UserStatus.ACTIVE;
      return user.save();
    }

    // Crear nuevo usuario Google — activo de inmediato (Google verifica el email)
    const newUser = new this.userModel({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      password: null,
      status: UserStatus.ACTIVE, // Google ya verificó el email
    });
    return newUser.save();
  }

  async updateCedula(userId: string, cedula: string, name: string): Promise<UserDocument> {
    // Verificar cédula única (excluyendo el usuario actual)
    const existingCedula = await this.userModel.findOne({
      cedula,
      _id: { $ne: userId },
    });
    if (existingCedula) {
      throw new ConflictException('La cédula ya está registrada en el sistema');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.cedula = cedula;
    user.name = name;
    return user.save();
  }
}
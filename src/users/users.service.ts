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
    const existingEmail = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });
    if (existingEmail) throw new ConflictException('El correo electrónico ya está registrado');

    const existingCedula = await this.userModel.findOne({ cedula: createUserDto.cedula });
    if (existingCedula) throw new ConflictException('La cédula ya está registrada en el sistema');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
      verificationTokenExpires: { $gt: new Date() },
    });
  }

  async activateUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { status: UserStatus.ACTIVE, verificationToken: null, verificationTokenExpires: null },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── 2FA methods ───────────────────────────────────────────────────────────

  /**
   * Genera un código 2FA de 6 dígitos, lo guarda en la DB con expiración de 10 min
   * y devuelve el código para que el servicio lo envíe por SMS.
   */
  async generateTwoFactorCode(userId: string): Promise<string> {
    // Código numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await this.userModel.findByIdAndUpdate(userId, {
      twoFactorCode: code,
      twoFactorExpires: expires,
    });

    return code;
  }

  /**
   * Verifica el código 2FA. Si es correcto lo limpia de la DB y devuelve el usuario.
   */
  async verifyTwoFactorCode(
    userId: string,
    code: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({
      _id: userId,
      twoFactorCode: code,
      twoFactorExpires: { $gt: new Date() },
    });

    if (!user) return null;

    // Limpiar el código usado
    user.twoFactorCode = null as any;
    user.twoFactorExpires = null as any;
    await user.save();

    return user;
  }

  async findOrCreateGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<UserDocument> {
    let user = await this.userModel.findOne({ googleId: profile.googleId });
    if (user) return user;

    user = await this.userModel.findOne({ email: profile.email });
    if (user) {
      user.googleId = profile.googleId;
      user.status = UserStatus.ACTIVE;
      return user.save();
    }

    const newUser = new this.userModel({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      password: null,
      status: UserStatus.ACTIVE,
    });
    return newUser.save();
  }

  async updateCedula(userId: string, cedula: string, name: string): Promise<UserDocument> {
    const existingCedula = await this.userModel.findOne({ cedula, _id: { $ne: userId } });
    if (existingCedula) throw new ConflictException('La cédula ya está registrada en el sistema');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    user.cedula = cedula;
    user.name = name;
    return user.save();
  }
}
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Verificar email único
    const existingEmail = await this.userModel.findOne({ email: createUserDto.email.toLowerCase() });
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Verificar cédula única
    const existingCedula = await this.userModel.findOne({ cedula: createUserDto.cedula });
    if (existingCedula) {
      throw new ConflictException('La cédula ya está registrada en el sistema');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = new this.userModel({ ...createUserDto, password: hashedPassword });
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

  async findOrCreateGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<UserDocument> {
    // Buscar por googleId primero
    let user = await this.userModel.findOne({ googleId: profile.googleId });
    if (user) return user;

    // Buscar por email
    user = await this.userModel.findOne({ email: profile.email });
    if (user) {
      // Vincular googleId al usuario existente
      user.googleId = profile.googleId;
      return user.save();
    }

    // Crear nuevo usuario Google (sin cédula aún)
    const newUser = new this.userModel({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      password: null,
    });
    return newUser.save();
  }

  async updateCedula(userId: string, cedula: string, name: string): Promise<UserDocument> {
    // Verificar que la cédula no esté en uso por otro usuario
    const existingCedula = await this.userModel.findOne({
      cedula,
      _id: { $ne: userId }, // excluir el usuario actual
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
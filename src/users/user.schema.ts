import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: false, default: null })
  password!: string;

  @Prop({ default: null })
  phone!: string;

  @Prop({ required: false, trim: true, unique: true, sparse: true })
  cedula!: string;

  @Prop({ default: null })
  googleId!: string;

  // Estado de la cuenta: pending = esperando verificación, active = verificado
  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  // Token único para verificar el correo
  @Prop({ default: null })
  verificationToken!: string;

  // Expiración del token (24 horas)
  @Prop({ default: null })
  verificationTokenExpires!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // Nunca exponer password ni tokens de verificación
    const { password, verificationToken, verificationTokenExpires, ...rest } = ret;
    return rest;
  },
});
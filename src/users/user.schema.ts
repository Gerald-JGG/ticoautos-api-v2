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

  @Prop({ required: false, trim: true })
  phone!: string;

  @Prop({ required: false, trim: true, unique: true, sparse: true })
  cedula!: string;

  @Prop({ default: null })
  googleId!: string;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status!: UserStatus;

  @Prop({ default: null })
  verificationToken!: string;

  @Prop({ default: null })
  verificationTokenExpires!: Date;

  // ── 2FA fields ────────────────────────────────────────────────────────────
  @Prop({ default: null })
  twoFactorCode!: string;

  @Prop({ default: null })
  twoFactorExpires!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const {
      password,
      verificationToken,
      verificationTokenExpires,
      twoFactorCode,
      twoFactorExpires,
      ...rest
    } = ret;
    return rest;
  },
});
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

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

  @Prop({ required: false, trim: true })
  cedula!: string;

  @Prop({ default: null })
  googleId!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { password, ...rest } = ret;
    return rest;
  },
});
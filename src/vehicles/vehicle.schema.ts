import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

export enum VehicleStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
}

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, trim: true })
  brand!: string;

  @Prop({ required: true, trim: true })
  model!: string;

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: VehicleStatus, default: VehicleStatus.AVAILABLE })
  status!: VehicleStatus;

  @Prop({ default: 0 })
  mileage!: number;

  @Prop({ trim: true })
  color!: string;

  @Prop({ trim: true })
  transmission!: string;

  @Prop({ trim: true })
  fuel!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner!: Types.ObjectId;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

// Text index for search
VehicleSchema.index({ brand: 'text', model: 'text', description: 'text' });
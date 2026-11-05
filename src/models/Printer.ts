import mongoose, { Schema, Document } from 'mongoose';

export interface IPrinter extends Document {
  deviceName: string;
  building: string;
  department: string;
  connectionType: 'IP-based' | 'Cable-connected';
  ipAddress?: string;
  status: 'online' | 'offline' | 'unknown';
  lastChecked?: Date;
  uptimePercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PrinterSchema = new Schema<IPrinter>(
  {
    deviceName: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    connectionType: {
      type: String,
      required: [true, 'Connection type is required'],
      enum: ['IP-based', 'Cable-connected'],
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'unknown'],
      default: 'unknown',
    },
    lastChecked: {
      type: Date,
    },
    uptimePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Printer || mongoose.model<IPrinter>('Printer', PrinterSchema);

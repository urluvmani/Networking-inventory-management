import mongoose, { Schema, Document } from 'mongoose';

export interface ISystem extends Document {
  deviceName: string;
  building: string;
  department: string;
  connectionType: 'IP-based' | 'Cable-connected';
  ipAddress?: string;
  status?: 'online' | 'offline' | 'unknown';
  lastChecked?: Date;
  uptimePercentage?: number;
  createdAt: Date;
  updatedAt: Date;
  hardwareDetails?: {
    ram?: string;
    hardDisk?: string;
    cpu?: string;
    os?: string;
    motherboard?: string;
  };
  previousHardwareDetails?: {
    ram?: string;
    hardDisk?: string;
    cpu?: string;
    os?: string;
    motherboard?: string;
  };
  hardwareChanges?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    detectedAt: Date;
  }>;
}

const SystemSchema = new Schema<ISystem>(
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
      default: 0,
      min: 0,
      max: 100,
    },
    hardwareDetails: {
      ram: String,
      hardDisk: String,
      cpu: String,
      os: String,
      motherboard: String,
    },
    previousHardwareDetails: {
      ram: String,
      hardDisk: String,
      cpu: String,
      os: String,
      motherboard: String,
    },
    hardwareChanges: [{
      field: String,
      oldValue: String,
      newValue: String,
      detectedAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.System || mongoose.model<ISystem>('System', SystemSchema);

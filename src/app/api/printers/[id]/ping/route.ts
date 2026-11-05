import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Printer from '@/models/Printer';
import { pingIP } from '@/lib/ping';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('Ping request for printer ID:', id);
    
    const printer = await Printer.findById(id);
    console.log('Found printer:', printer ? printer.deviceName : 'null');
    
    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }

    if (!printer.ipAddress || printer.connectionType !== 'IP-based') {
      return NextResponse.json(
        { error: 'Printer must be IP-based with an IP address' },
        { status: 400 }
      );
    }

    const pingResult = await pingIP(printer.ipAddress);
    const newStatus = pingResult.isOnline ? 'online' : 'offline';
    
    const previousStatus = printer.status;
    let uptimePercentage = printer.uptimePercentage || 0;
    
    if (previousStatus === 'online' && newStatus === 'offline') {
      uptimePercentage = Math.max(0, uptimePercentage - 5);
    } else if (previousStatus === 'offline' && newStatus === 'online') {
      uptimePercentage = Math.min(100, uptimePercentage + 5);
    } else if (newStatus === 'online') {
      uptimePercentage = Math.min(100, uptimePercentage + 1);
    }

    printer.status = newStatus;
    printer.lastChecked = new Date();
    printer.uptimePercentage = uptimePercentage;
    await printer.save();

    return NextResponse.json({
      success: true,
      printer: {
        _id: printer._id,
        deviceName: printer.deviceName,
        status: printer.status,
        lastChecked: printer.lastChecked,
        uptimePercentage: printer.uptimePercentage,
        ipAddress: printer.ipAddress,
        responseTime: pingResult.responseTime,
      },
    });
  } catch (error) {
    console.error('Error pinging printer:', error);
    return NextResponse.json(
      { error: 'Failed to ping printer' },
      { status: 500 }
    );
  }
}

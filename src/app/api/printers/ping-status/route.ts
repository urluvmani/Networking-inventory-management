import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Printer from '@/models/Printer';
import { pingSpecificIPs } from '@/lib/ping';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const printers = await Printer.find({
      connectionType: 'IP-based',
      ipAddress: { $exists: true, $ne: null },
    });

    const ipAddresses = printers.map(p => p.ipAddress).filter(Boolean) as string[];
    const pingResults = await pingSpecificIPs(ipAddresses);

    const statusMap = new Map<string, boolean>();
    pingResults.forEach(result => {
      statusMap.set(result.ip, result.isOnline);
    });

    const updatePromises = printers.map(printer => {
      if (printer.ipAddress && statusMap.has(printer.ipAddress)) {
        const isOnline = statusMap.get(printer.ipAddress)!;
        
        const previousStatus = printer.status;
        const newStatus = isOnline ? 'online' : 'offline';
        
        let uptimePercentage = printer.uptimePercentage || 0;
        
        if (previousStatus === 'online' && newStatus === 'offline') {
          uptimePercentage = Math.max(0, uptimePercentage - 5);
        } else if (previousStatus === 'offline' && newStatus === 'online') {
          uptimePercentage = Math.min(100, uptimePercentage + 5);
        } else if (newStatus === 'online') {
          uptimePercentage = Math.min(100, uptimePercentage + 1);
        }

        return Printer.findByIdAndUpdate(
          printer._id,
          {
            status: newStatus,
            lastChecked: new Date(),
            uptimePercentage,
          },
          { new: true }
        );
      }
      return Promise.resolve(printer);
    });

    const updatedPrinters = await Promise.all(updatePromises);

    return NextResponse.json({
      message: 'Printer statuses updated successfully',
      updated: updatedPrinters.length,
      printers: updatedPrinters,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update printer statuses' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    
    const printers = await Printer.find({
      connectionType: 'IP-based',
      ipAddress: { $exists: true, $ne: null },
    });

    const onlineCount = printers.filter(p => p.status === 'online').length;
    const offlineCount = printers.filter(p => p.status === 'offline').length;
    const unknownCount = printers.filter(p => p.status === 'unknown').length;

    const avgUptime = printers.reduce((sum, p) => sum + (p.uptimePercentage || 0), 0) / printers.length;

    return NextResponse.json({
      total: printers.length,
      online: onlineCount,
      offline: offlineCount,
      unknown: unknownCount,
      averageUptime: avgUptime.toFixed(2),
      printers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch printer status' },
      { status: 500 }
    );
  }
}

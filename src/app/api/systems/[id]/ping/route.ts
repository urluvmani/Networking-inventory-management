import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import { pingIP } from '@/lib/ping';
import { getRemoteHardwareDetails, detectHardwareChanges, detectSignificantHardwareChanges } from '@/lib/wmi';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('Ping request for system ID:', id);
    
    const system = await System.findById(id);
    console.log('Found system:', system ? system.deviceName : 'null');
    
    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }

    if (!system.ipAddress || system.connectionType !== 'IP-based') {
      return NextResponse.json(
        { error: 'System must be IP-based with an IP address' },
        { status: 400 }
      );
    }

    const pingResult = await pingIP(system.ipAddress);
    const newStatus = pingResult.isOnline ? 'online' : 'offline';

    const previousStatus = system.status;
    let uptimePercentage = system.uptimePercentage || 0;

    if (previousStatus === 'online' && newStatus === 'offline') {
      uptimePercentage = Math.max(0, uptimePercentage - 5);
    } else if (previousStatus === 'offline' && newStatus === 'online') {
      uptimePercentage = Math.min(100, uptimePercentage + 5);
    } else if (newStatus === 'online') {
      uptimePercentage = Math.min(100, uptimePercentage + 1);
    }

    system.status = newStatus;
    system.lastChecked = new Date();
    system.uptimePercentage = uptimePercentage;

    let hardwareChanges: Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> = [];

    if (newStatus === 'online') {
      try {
        const newHardwareDetails = await getRemoteHardwareDetails(system.ipAddress);

        if (Object.keys(newHardwareDetails).length > 0) {
          const oldHardwareDetails = system.hardwareDetails;

          if (oldHardwareDetails) {
            system.previousHardwareDetails = { ...oldHardwareDetails };
          }

          // Log all changes in history
          const detectedChanges = detectHardwareChanges(oldHardwareDetails, newHardwareDetails);

          // Only trigger alerts for significant changes (RAM, drive removal, CPU, OS, Motherboard)
          const significantChanges = detectSignificantHardwareChanges(oldHardwareDetails, newHardwareDetails);

          if (detectedChanges.length > 0) {
            system.hardwareChanges = [
              ...(system.hardwareChanges || []),
              ...detectedChanges,
            ];
          }

          // Return only significant changes for alerts
          hardwareChanges = significantChanges;

          system.hardwareDetails = newHardwareDetails;
        }
      } catch (error) {
        console.error('Error fetching hardware details:', error);
      }
    }

    await system.save();

    return NextResponse.json({
      success: true,
      system: {
        _id: system._id,
        deviceName: system.deviceName,
        status: system.status,
        lastChecked: system.lastChecked,
        uptimePercentage: system.uptimePercentage,
        ipAddress: system.ipAddress,
        responseTime: pingResult.responseTime,
        hardwareDetails: system.hardwareDetails,
        previousHardwareDetails: system.previousHardwareDetails,
      },
      hardwareChanges,
    });
  } catch (error) {
    console.error('Error pinging system:', error);
    return NextResponse.json(
      { error: 'Failed to ping system' },
      { status: 500 }
    );
  }
}

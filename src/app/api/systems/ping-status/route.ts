import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import { pingSpecificIPs } from '@/lib/ping';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const systems = await System.find({
      connectionType: 'IP-based',
      ipAddress: { $exists: true, $ne: null },
    });

    console.log('Found IP-based systems:', systems.length);
    console.log('Systems:', systems.map(s => ({ name: s.deviceName, ip: s.ipAddress, currentStatus: s.status })));

    const ipAddresses = systems.map(s => s.ipAddress).filter(Boolean) as string[];
    const pingResults = await pingSpecificIPs(ipAddresses);

    console.log('Ping results:', pingResults);

    const statusMap = new Map<string, boolean>();
    pingResults.forEach(result => {
      statusMap.set(result.ip, result.isOnline);
    });

    const updatePromises = systems.map(async (system) => {
      if (system.ipAddress && statusMap.has(system.ipAddress)) {
        const isOnline = statusMap.get(system.ipAddress)!;
        
        const previousStatus = system.status;
        const newStatus = isOnline ? 'online' : 'offline';
        
        console.log(`System ${system.deviceName} (${system.ipAddress}): ${previousStatus} -> ${newStatus}`);
        
        let uptimePercentage = system.uptimePercentage || 0;
        
        if (previousStatus === 'online' && newStatus === 'offline') {
          uptimePercentage = Math.max(0, uptimePercentage - 5);
        } else if (previousStatus === 'offline' && newStatus === 'online') {
          uptimePercentage = Math.min(100, uptimePercentage + 5);
        } else if (newStatus === 'online') {
          uptimePercentage = Math.min(100, uptimePercentage + 1);
        }

        const updatedSystem = await System.findById(system._id);
        if (updatedSystem) {
          updatedSystem.status = newStatus;
          updatedSystem.lastChecked = new Date();
          updatedSystem.uptimePercentage = uptimePercentage;
          await updatedSystem.save();
          return updatedSystem;
        }
      }
      return system;
    });

    const updatedSystems = await Promise.all(updatePromises);

    console.log('Updated systems with status:', updatedSystems.map(s => ({
      name: s.deviceName,
      status: s.status,
      uptime: s.uptimePercentage
    })));

    return NextResponse.json({
      message: 'System statuses updated successfully',
      updated: updatedSystems.length,
      systems: updatedSystems,
    });
  } catch (error) {
    console.error('Error updating system statuses:', error);
    return NextResponse.json(
      { error: 'Failed to update system statuses' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    
    const systems = await System.find({
      connectionType: 'IP-based',
      ipAddress: { $exists: true, $ne: null },
    });

    const onlineCount = systems.filter(s => s.status === 'online').length;
    const offlineCount = systems.filter(s => s.status === 'offline').length;
    const unknownCount = systems.filter(s => s.status === 'unknown').length;

    const avgUptime = systems.reduce((sum, s) => sum + (s.uptimePercentage || 0), 0) / systems.length;

    return NextResponse.json({
      total: systems.length,
      online: onlineCount,
      offline: offlineCount,
      unknown: unknownCount,
      averageUptime: avgUptime.toFixed(2),
      systems,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
}

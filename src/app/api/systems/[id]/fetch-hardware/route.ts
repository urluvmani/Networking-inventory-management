import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import { detectHardwareChanges, detectSignificantHardwareChanges, getRemoteHardwareDetails, enableWinRMRemotely } from '@/lib/wmi';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { username, password } = body;

    console.log('Fetch hardware request for system ID:', id);

    const system = await System.findById(id);

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

    // Try agent first (no credentials needed)
    if (!username || !password) {
      console.log('Fetching hardware details from agent at:', system.ipAddress);

      try {
        const agentUrl = `http://${system.ipAddress}:8765/hardware`;
        const response = await fetch(agentUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: 'Agent not responding. Please deploy the agent first or provide credentials for WMI access.', requiresCredentials: true },
            { status: 400 }
          );
        }

        const data = await response.json();
        console.log('Agent response:', data);

        if (data.error) {
          return NextResponse.json(
            { error: `Agent error: ${data.error}`, requiresCredentials: true },
            { status: 500 }
          );
        }

        const newHardwareDetails = {
          ram: data.ram,
          hardDisk: data.hardDisk,
          cpu: data.cpu,
          os: data.os,
          motherboard: data.motherboard,
        };

        const oldHardwareDetails = system.hardwareDetails;
        let hardwareChanges: Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> = [];

        if (oldHardwareDetails) {
          system.previousHardwareDetails = { ...oldHardwareDetails };
        }

        // Log all changes in history
        const detectedChanges = detectHardwareChanges(oldHardwareDetails, newHardwareDetails);

        // Only trigger alerts for significant changes
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
        await system.save();

        return NextResponse.json({
          success: true,
          hardwareDetails: system.hardwareDetails,
          previousHardwareDetails: system.previousHardwareDetails,
          hardwareChanges,
        });
      } catch (fetchError: any) {
        console.error('Failed to fetch from agent:', fetchError);
        return NextResponse.json(
          { error: 'Agent not accessible. Please deploy the agent to this system first or provide credentials for WMI access.', requiresCredentials: true },
          { status: 400 }
        );
      }
    }

    // If credentials provided, use WMI approach
    console.log('Attempting to enable WinRM on remote system:', system.ipAddress);

    const winrmResult = await enableWinRMRemotely(system.ipAddress, username, password);

    if (!winrmResult.success) {
      return NextResponse.json(
        { error: `Failed to enable WinRM: ${winrmResult.error}` },
        { status: 400 }
      );
    }

    console.log('WinRM enabled successfully, fetching hardware details...');

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const newHardwareDetails = await getRemoteHardwareDetails(
        system.ipAddress,
        username,
        password
      );

      if (Object.keys(newHardwareDetails).length === 0) {
        return NextResponse.json(
          { error: 'Failed to fetch hardware details. WinRM may not be fully initialized.' },
          { status: 500 }
        );
      }

      const oldHardwareDetails = system.hardwareDetails;
      let hardwareChanges: Array<{ field: string; oldValue: string; newValue: string; detectedAt: Date }> = [];

      if (oldHardwareDetails) {
        system.previousHardwareDetails = { ...oldHardwareDetails };
      }

      // Log all changes in history
      const detectedChanges = detectHardwareChanges(oldHardwareDetails, newHardwareDetails);

      // Only trigger alerts for significant changes
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
      await system.save();

      return NextResponse.json({
        success: true,
        hardwareDetails: system.hardwareDetails,
        previousHardwareDetails: system.previousHardwareDetails,
        hardwareChanges,
      });
    } catch (error: any) {
      console.error('Error fetching hardware details:', error);
      return NextResponse.json(
        { error: `Failed to fetch hardware details: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching hardware details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hardware details' },
      { status: 500 }
    );
  }
}

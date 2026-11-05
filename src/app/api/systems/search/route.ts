import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const building = searchParams.get('building') || '';
    const department = searchParams.get('department') || '';
    const ipAddress = searchParams.get('ipAddress') || '';
    const connectionType = searchParams.get('connectionType') || '';

    const filter: any = {};

    if (query) {
      filter.$or = [
        { deviceName: { $regex: query, $options: 'i' } },
        { building: { $regex: query, $options: 'i' } },
        { department: { $regex: query, $options: 'i' } },
        { ipAddress: { $regex: query, $options: 'i' } },
      ];
    }

    if (building) {
      filter.building = { $regex: building, $options: 'i' };
    }

    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    if (ipAddress) {
      filter.ipAddress = { $regex: ipAddress, $options: 'i' };
    }

    if (connectionType) {
      filter.connectionType = connectionType;
    }

    const systems = await System.find(filter).sort({ createdAt: -1 });
    
    return NextResponse.json(systems, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search systems' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import Printer from '@/models/Printer';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const building = searchParams.get('building') || '';
    const department = searchParams.get('department') || '';
    const type = searchParams.get('type') || 'all'; // 'systems', 'printers', or 'all'

    const filter: any = {};

    if (building) {
      filter.building = { $regex: building, $options: 'i' };
    }

    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }

    let results: any = {};

    if (type === 'systems' || type === 'all') {
      const systems = await System.find(filter).sort({ createdAt: -1 });
      results.systems = systems;
    }

    if (type === 'printers' || type === 'all') {
      const printers = await Printer.find(filter).sort({ createdAt: -1 });
      results.printers = printers;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search by location' },
      { status: 500 }
    );
  }
}

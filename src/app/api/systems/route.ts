import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';

export async function GET() {
  try {
    await connectDB();
    const systems = await System.find({}).sort({ createdAt: -1 });
    return NextResponse.json(systems, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch systems' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    if (body.connectionType === 'IP-based' && !body.ipAddress) {
      return NextResponse.json(
        { error: 'IP address is required for IP-based devices' },
        { status: 400 }
      );
    }
    
    if (body.ipAddress && !/^(\d{1,3}\.){3}\d{1,3}$/.test(body.ipAddress)) {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
        { status: 400 }
      );
    }
    
    const system = await System.create(body);
    return NextResponse.json(system, { status: 201 });
  } catch (error: any) {
    console.error('Error creating system:', error);
    
    if (error.message && error.message.includes('MONGODB_URI')) {
      return NextResponse.json(
        { error: 'MongoDB is not configured. Please set MONGODB_URI in .env.local' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create system' },
      { status: 500 }
    );
  }
}

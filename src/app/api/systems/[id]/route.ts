import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const system = await System.findById(id);
    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(system, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch system' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const system = await System.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(system, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update system' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const system = await System.findByIdAndDelete(id);
    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'System deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete system' },
      { status: 500 }
    );
  }
}

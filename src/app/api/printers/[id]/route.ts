import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Printer from '@/models/Printer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const printer = await Printer.findById(id);
    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(printer, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch printer' },
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
    const printer = await Printer.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(printer, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update printer' },
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
    const printer = await Printer.findByIdAndDelete(id);
    if (!printer) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Printer deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete printer' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import Printer from '@/models/Printer';
import { createObjectCsvWriter } from 'csv-writer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    await connectDB();
    const { type } = await params;

    let data;
    let filename;

    if (type === 'systems') {
      data = await System.find({}).sort({ createdAt: -1 });
      filename = 'systems-report.csv';
    } else if (type === 'printers') {
      data = await Printer.find({}).sort({ createdAt: -1 });
      filename = 'printers-report.csv';
    } else {
      return NextResponse.json(
        { error: 'Invalid export type' },
        { status: 400 }
      );
    }

    const csvContent = generateCSV(data, type);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[], type: string): string {
  if (data.length === 0) {
    return 'No data available';
  }

  const headers = type === 'systems'
    ? ['Device Name', 'Building', 'Department', 'Connection Type', 'IP Address', 'Created At']
    : ['Device Name', 'Building', 'Department', 'Connection Type', 'IP Address', 'Status', 'Last Checked', 'Uptime %', 'Created At'];

  const rows = data.map((item) => {
    if (type === 'systems') {
      return [
        item.deviceName,
        item.building,
        item.department,
        item.connectionType,
        item.ipAddress || '',
        new Date(item.createdAt).toISOString(),
      ];
    } else {
      return [
        item.deviceName,
        item.building,
        item.department,
        item.connectionType,
        item.ipAddress || '',
        item.status || 'unknown',
        item.lastChecked ? new Date(item.lastChecked).toISOString() : '',
        item.uptimePercentage?.toFixed(2) || '0',
        new Date(item.createdAt).toISOString(),
      ];
    }
  });

  const csvRows = [headers, ...rows];
  return csvRows.map(row => row.join(',')).join('\n');
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import Printer from '@/models/Printer';

export async function GET() {
  try {
    await connectDB();

    // Get unique departments from both systems and printers
    const systemDepartments = await System.distinct('department');
    const printerDepartments = await Printer.distinct('department');

    // Combine and deduplicate departments
    const allDepartments = Array.from(new Set([...systemDepartments, ...printerDepartments]));

    // Sort alphabetically (case-insensitive)
    allDepartments.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return NextResponse.json({ departments: allDepartments });
  } catch (error: any) {
    console.error('Failed to fetch departments:', error);
    // Return empty array instead of error to avoid breaking the UI
    return NextResponse.json({ departments: [] });
  }
}

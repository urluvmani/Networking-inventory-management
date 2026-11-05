import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import System from '@/models/System';
import Printer from '@/models/Printer';

export async function GET() {
  try {
    await connectDB();

    const systems = await System.find({});
    const printers = await Printer.find({});

    const systemDepartments = systems.reduce((acc, system) => {
      const normalizedDept = system.department.toLowerCase();
      acc[normalizedDept] = (acc[normalizedDept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const printerDepartments = printers.reduce((acc, printer) => {
      const normalizedDept = printer.department.toLowerCase();
      acc[normalizedDept] = (acc[normalizedDept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const onlinePrinters = printers.filter(p => p.status === 'online').length;
    const totalPrinters = printers.length;
    const printerUptime = totalPrinters > 0 
      ? (onlinePrinters / totalPrinters) * 100 
      : 0;

    const onlineSystems = systems.filter(s => s.status === 'online').length;
    const totalSystems = systems.length;
    const systemUptime = totalSystems > 0 
      ? (onlineSystems / totalSystems) * 100 
      : 0;

    const systemBuildings = systems.reduce((acc, system) => {
      acc[system.building] = (acc[system.building] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const printerBuildings = printers.reduce((acc, printer) => {
      acc[printer.building] = (acc[printer.building] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      systems: {
        total: systems.length,
        byDepartment: systemDepartments,
        byBuilding: systemBuildings,
        ipBased: systems.filter(s => s.connectionType === 'IP-based').length,
        cableConnected: systems.filter(s => s.connectionType === 'Cable-connected').length,
        online: onlineSystems,
        offline: systems.filter(s => s.status === 'offline').length,
        unknown: systems.filter(s => s.status === 'unknown').length,
        uptimePercentage: systemUptime.toFixed(2),
      },
      printers: {
        total: printers.length,
        byDepartment: printerDepartments,
        byBuilding: printerBuildings,
        ipBased: printers.filter(p => p.connectionType === 'IP-based').length,
        cableConnected: printers.filter(p => p.connectionType === 'Cable-connected').length,
        online: onlinePrinters,
        offline: printers.filter(p => p.status === 'offline').length,
        unknown: printers.filter(p => p.status === 'unknown').length,
        uptimePercentage: printerUptime.toFixed(2),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

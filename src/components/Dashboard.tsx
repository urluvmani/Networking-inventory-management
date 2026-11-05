'use client';

import { useEffect, useState } from 'react';
import StatsCards from './StatsCards';
import DepartmentChart from './DepartmentChart';
import DeviceTable from './DeviceTable';
import AddDeviceModal from './AddDeviceModal';
import SearchBar, { SearchFilters } from './SearchBar';
import LocationSearch from './LocationSearch';
import { FiRefreshCw, FiDownload, FiX } from 'react-icons/fi';

interface Stats {
  systems: {
    total: number;
    byDepartment: Record<string, number>;
    byBuilding: Record<string, number>;
    ipBased: number;
    cableConnected: number;
    online: number;
    offline: number;
    unknown: number;
    uptimePercentage: string;
  };
  printers: {
    total: number;
    byDepartment: Record<string, number>;
    byBuilding: Record<string, number>;
    ipBased: number;
    cableConnected: number;
    online: number;
    offline: number;
    unknown: number;
    uptimePercentage: string;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'systems' | 'printers'>('systems');
  const [refreshing, setRefreshing] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    building: '',
    department: '',
    ipAddress: '',
    connectionType: '',
    status: '',
  });
  const [locationResults, setLocationResults] = useState<any>(null);
  const [showLocationResults, setShowLocationResults] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrinterStatus = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/printers/ping-status', { method: 'POST' });
      await fetchStats();
    } catch (error) {
      console.error('Failed to refresh printer status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshSystemStatus = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/systems/ping-status', { method: 'POST' });
      const data = await response.json();
      console.log('System status update response:', data);
      await fetchStats();
    } catch (error) {
      console.error('Failed to refresh system status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/export/${activeTab}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const handleLocationSearch = async (building: string, department: string) => {
    if (!building && !department) {
      setShowLocationResults(false);
      setLocationResults(null);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (building) params.append('building', building);
      if (department) params.append('department', department);
      
      const response = await fetch(`/api/location?${params.toString()}`);
      const data = await response.json();
      setLocationResults(data);
      setShowLocationResults(true);
    } catch (error) {
      console.error('Failed to search by location:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          IT Inventory Management
        </h1>
        <p className="text-gray-600">
          Monitor and manage your IT infrastructure
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setActiveTab('systems');
            setSearchFilters({
              query: '',
              building: '',
              department: '',
              ipAddress: '',
              connectionType: '',
              status: '',
            });
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'systems'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Systems
        </button>
        <button
          onClick={() => {
            setActiveTab('printers');
            setSearchFilters({
              query: '',
              building: '',
              department: '',
              ipAddress: '',
              connectionType: '',
              status: '',
            });
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'printers'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Printers
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Add Device
        </button>
        {activeTab === 'printers' && (
          <button
            onClick={refreshPrinterStatus}
            disabled={refreshing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Check Printer Status
          </button>
        )}
        {activeTab === 'systems' && (
          <button
            onClick={refreshSystemStatus}
            disabled={refreshing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Check System Status
          </button>
        )}
        <button
          onClick={exportReport}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <FiDownload />
          Export Report
        </button>
      </div>

      <StatsCards stats={stats} activeTab={activeTab} />
      
      <div className="mt-8">
        <DepartmentChart stats={stats} activeTab={activeTab} />
      </div>

      <div className="mt-8">
        <LocationSearch onLocationSearch={handleLocationSearch} />
      </div>

      {showLocationResults && locationResults && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Location Search Results
            </h3>
            <button
              onClick={() => {
                setShowLocationResults(false);
                setLocationResults(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX />
            </button>
          </div>
          
          {locationResults.systems && locationResults.systems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Systems ({locationResults.systems.length})
              </h4>
              <div className="space-y-2">
                {locationResults.systems.map((system: any) => (
                  <div key={system._id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{system.deviceName}</p>
                      <p className="text-sm text-gray-600">
                        {system.building} - {system.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{system.connectionType}</p>
                      {system.ipAddress && (
                        <p className="text-sm font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                          {system.ipAddress}
                        </p>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        system.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : system.status === 'offline'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {system.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {locationResults.printers && locationResults.printers.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Printers ({locationResults.printers.length})
              </h4>
              <div className="space-y-2">
                {locationResults.printers.map((printer: any) => (
                  <div key={printer._id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{printer.deviceName}</p>
                      <p className="text-sm text-gray-600">
                        {printer.building} - {printer.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{printer.connectionType}</p>
                      {printer.ipAddress && (
                        <p className="text-sm font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                          {printer.ipAddress}
                        </p>
                      )}
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        printer.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : printer.status === 'offline'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {printer.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!locationResults.systems || locationResults.systems.length === 0) && 
           (!locationResults.printers || locationResults.printers.length === 0) && (
            <p className="text-gray-500 text-center py-4">No devices found at this location</p>
          )}
        </div>
      )}

      <div className="mt-8">
        <SearchBar 
          onSearch={setSearchFilters} 
          type={activeTab} 
        />
      </div>

      <div className="mt-8">
        <DeviceTable 
          activeTab={activeTab} 
          onUpdate={fetchStats} 
          searchFilters={searchFilters}
        />
      </div>

      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchStats();
          }}
          type={activeTab}
        />
      )}
    </div>
  );
}

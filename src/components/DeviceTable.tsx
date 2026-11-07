'use client';

import { useEffect, useState } from 'react';
import { FiEdit, FiTrash2, FiActivity, FiCpu, FiHelpCircle } from 'react-icons/fi';
import { SearchFilters } from './SearchBar';

interface Device {
  _id: string;
  deviceName: string;
  building: string;
  department: string;
  connectionType: string;
  ipAddress?: string;
  defaultGateway?: string;
  adminPassword?: string;
  status?: string;
  lastChecked?: string;
  uptimePercentage?: number;
  pinging?: boolean;
  hardwareDetails?: {
    ram?: string;
    hardDisk?: string;
    cpu?: string;
    os?: string;
    motherboard?: string;
  };
  previousHardwareDetails?: {
    ram?: string;
    hardDisk?: string;
    cpu?: string;
    os?: string;
    motherboard?: string;
  };
  hardwareChanges?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    detectedAt: Date | string;
  }>;
}

interface DeviceTableProps {
  activeTab: 'systems' | 'printers';
  onUpdate: () => void;
  searchFilters?: SearchFilters;
}

export default function DeviceTable({ activeTab, onUpdate, searchFilters }: DeviceTableProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [hardwareAlerts, setHardwareAlerts] = useState<Record<string, any>>({});
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [fetchingHardware, setFetchingHardware] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDeviceForHistory, setSelectedDeviceForHistory] = useState<Device | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const handleDepartmentChange = (value: string) => {
    if (editingDevice) {
      setEditingDevice({ ...editingDevice, department: value });
      if (value.length > 0) {
        const filtered = departments.filter(dept =>
          dept.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredDepartments(filtered);
        setShowDeptSuggestions(true);
      } else {
        setShowDeptSuggestions(false);
      }
    }
  };

  const selectDepartment = (dept: string) => {
    if (editingDevice) {
      setEditingDevice({ ...editingDevice, department: dept });
      setShowDeptSuggestions(false);
    }
  };

  const fetchDevices = async (filters?: SearchFilters) => {
    try {
      let url = `/api/${activeTab}`;
      
      if (filters && Object.values(filters).some(value => value !== '')) {
        const params = new URLSearchParams();
        if (filters.query) params.append('q', filters.query);
        if (filters.building) params.append('building', filters.building);
        if (filters.department) params.append('department', filters.department);
        if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
        if (filters.connectionType) params.append('connectionType', filters.connectionType);
        if (filters.status) params.append('status', filters.status);
        
        url = `/api/${activeTab}/search?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setDevices(data);
      } else {
        console.error('Invalid data format:', data);
        setDevices([]);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE' });
      await fetchDevices();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  const updateDevice = async (id: string, updates: Partial<Device>) => {
    try {
      await fetch(`/api/${activeTab}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await fetchDevices();
      onUpdate();
      setEditingDevice(null);
    } catch (error) {
      console.error('Failed to update device:', error);
    }
  };

  const pingDevice = async (id: string) => {
    setDevices(devices.map(d => d._id === id ? { ...d, pinging: true } : d));

    try {
      const response = await fetch(`/api/${activeTab}/${id}/ping`, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        const deviceData = activeTab === 'systems' ? data.system : data.printer;
        setDevices(devices.map(d =>
          d._id === id
            ? {
                ...d,
                status: deviceData.status,
                uptimePercentage: deviceData.uptimePercentage,
                lastChecked: deviceData.lastChecked,
                hardwareDetails: deviceData.hardwareDetails,
                previousHardwareDetails: deviceData.previousHardwareDetails,
                pinging: false
              }
            : d
        ));

        if (data.hardwareChanges && data.hardwareChanges.length > 0) {
          setHardwareAlerts(prev => ({
            ...prev,
            [id]: data.hardwareChanges
          }));

          data.hardwareChanges.forEach((change: any) => {
            alert(`Hardware Change Detected for ${deviceData.deviceName}:\n\n${change.field.toUpperCase()}: ${change.oldValue} → ${change.newValue}\n\nDetected at: ${new Date(change.detectedAt).toLocaleString()}`);
          });
        }

        onUpdate();
      }
    } catch (error) {
      console.error('Failed to ping device:', error);
      setDevices(devices.map(d => d._id === id ? { ...d, pinging: false } : d));
    }
  };

  const fetchHardwareDetails = async (id: string) => {
    setDevices(devices.map(d => d._id === id ? { ...d, pinging: true } : d));

    try {
      // First try without credentials (agent approach)
      const response = await fetch(`/api/systems/${id}/fetch-hardware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        setDevices(devices.map(d =>
          d._id === id
            ? {
                ...d,
                hardwareDetails: data.hardwareDetails,
                previousHardwareDetails: data.previousHardwareDetails,
                pinging: false
              }
            : d
        ));

        if (data.hardwareChanges && data.hardwareChanges.length > 0) {
          data.hardwareChanges.forEach((change: any) => {
            alert(`Hardware Change Detected:\n\n${change.field.toUpperCase()}: ${change.oldValue} → ${change.newValue}\n\nDetected at: ${new Date(change.detectedAt).toLocaleString()}`);
          });
        }

        alert('Hardware details fetched successfully!');
      } else if (data.requiresCredentials) {
        // Agent not available, show credentials modal for WMI approach
        setDevices(devices.map(d => d._id === id ? { ...d, pinging: false } : d));
        setSelectedDeviceId(id);
        setShowCredentialsModal(true);
      } else {
        setDevices(devices.map(d => d._id === id ? { ...d, pinging: false } : d));
        alert(data.error || 'Failed to fetch hardware details');
      }
    } catch (error) {
      console.error('Failed to fetch hardware details:', error);
      setDevices(devices.map(d => d._id === id ? { ...d, pinging: false } : d));
      alert('Failed to fetch hardware details');
    }
  };

  const handleCredentialsSubmit = async () => {
    if (!credentials.username || !credentials.password) {
      alert('Please enter both username and password');
      return;
    }

    if (!selectedDeviceId) return;

    setFetchingHardware(true);
    setShowCredentialsModal(false);

    try {
      const response = await fetch(`/api/systems/${selectedDeviceId}/fetch-hardware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        setDevices(devices.map(d =>
          d._id === selectedDeviceId
            ? {
                ...d,
                hardwareDetails: data.hardwareDetails,
                previousHardwareDetails: data.previousHardwareDetails,
              }
            : d
        ));

        if (data.hardwareChanges && data.hardwareChanges.length > 0) {
          data.hardwareChanges.forEach((change: any) => {
            alert(`Hardware Change Detected:\n\n${change.field.toUpperCase()}: ${change.oldValue} → ${change.newValue}\n\nDetected at: ${new Date(change.detectedAt).toLocaleString()}`);
          });
        }

        alert('Hardware details fetched successfully!');
      } else {
        alert(data.error || 'Failed to fetch hardware details');
      }
    } catch (error) {
      console.error('Failed to fetch hardware details:', error);
      alert('Failed to fetch hardware details');
    } finally {
      setFetchingHardware(false);
      setCredentials({ username: '', password: '' });
      setSelectedDeviceId(null);
    }
  };

  useEffect(() => {
    fetchDevices(searchFilters);
  }, [activeTab, searchFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilters, activeTab]);

  const totalPages = Math.ceil(devices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDevices = devices.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {activeTab === 'systems' ? 'Systems' : 'Printers'}
        </h2>
        <span className="text-sm text-gray-600 font-medium">
          Total: {devices.length} devices
        </span>
      </div>
      
      {devices.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No devices found</p>
      ) : (
        <>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Device Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Building</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Connection</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">IP Address</th>
                  {activeTab === 'systems' && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Gateway</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Admin Pass</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Hardware</th>
                    </>
                  )}
                  {(activeTab === 'printers' || activeTab === 'systems') && (
                    <>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Uptime</th>
                    </>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevices.map((device) => (
                <tr key={device._id} className="border-b border-gray-100 hover:bg-gray-50">
                  {editingDevice?._id === device._id ? (
                    <>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingDevice.deviceName}
                          onChange={(e) => setEditingDevice({ ...editingDevice, deviceName: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingDevice.building}
                          onChange={(e) => setEditingDevice({ ...editingDevice, building: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="py-3 px-4 relative">
                        <input
                          type="text"
                          value={editingDevice.department}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          onFocus={() => {
                            if (editingDevice.department.length === 0) {
                              setFilteredDepartments(departments);
                              setShowDeptSuggestions(true);
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 200)}
                          className="w-full px-2 py-1 border rounded"
                          autoComplete="off"
                        />
                        {showDeptSuggestions && filteredDepartments.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                            {filteredDepartments.map((dept) => (
                              <div
                                key={dept}
                                onClick={() => selectDepartment(dept)}
                                className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-xs text-gray-700"
                              >
                                {dept}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={editingDevice.connectionType}
                          onChange={(e) => setEditingDevice({ ...editingDevice, connectionType: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                        >
                          <option value="IP-based">IP-based</option>
                          <option value="Cable-connected">Cable-connected</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={editingDevice.ipAddress || ''}
                          onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
                          className="w-full px-2 py-1 border rounded"
                          placeholder="Optional"
                        />
                      </td>
                      {activeTab === 'systems' && (
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editingDevice.defaultGateway || ''}
                              onChange={(e) => setEditingDevice({ ...editingDevice, defaultGateway: e.target.value })}
                              className="w-full px-2 py-1 border rounded"
                              placeholder="e.g., 192.168.1.1"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editingDevice.adminPassword || ''}
                              onChange={(e) => setEditingDevice({ ...editingDevice, adminPassword: e.target.value })}
                              className="w-full px-2 py-1 border rounded"
                            >
                              <option value="">Select Password</option>
                              <option value="P@$$C00">P@$$C00</option>
                              <option value="Pride">Pride</option>
                              <option value="com123">com123</option>
                              <option value="Capital.com">Capital.com</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs">
                            Auto-synced
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => updateDevice(device._id, editingDevice)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingDevice(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 ml-2"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 text-gray-900">{device.deviceName}</td>
                      <td className="py-3 px-4 text-gray-700">{device.building}</td>
                      <td className="py-3 px-4 text-gray-700">{device.department}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          device.connectionType === 'IP-based' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {device.connectionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-sm">
                        {device.ipAddress || '-'}
                      </td>
                      {activeTab === 'systems' && (
                        <>
                          <td className="py-3 px-4 text-gray-700 font-mono text-sm">
                            {device.defaultGateway || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {device.adminPassword ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                device.adminPassword === 'P@$$C00'
                                  ? 'bg-purple-100 text-purple-800'
                                  : device.adminPassword === 'Pride'
                                  ? 'bg-blue-100 text-blue-800'
                                  : device.adminPassword === 'com123'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {device.adminPassword}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Not set</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                          {device.hardwareDetails ? (
                            <div className="text-xs space-y-1">
                              <div
                                className="group relative cursor-help"
                                title={`RAM: ${device.hardwareDetails.ram || 'N/A'}
Hard Disk: ${device.hardwareDetails.hardDisk || 'N/A'}
CPU: ${device.hardwareDetails.cpu || 'N/A'}
OS: ${device.hardwareDetails.os || 'N/A'}
Motherboard: ${device.hardwareDetails.motherboard || 'N/A'}`}
                              >
                                {device.hardwareDetails.ram && (
                                  <div className="text-gray-600 group-hover:text-blue-600 transition-colors">RAM: {device.hardwareDetails.ram}</div>
                                )}
                                {device.hardwareDetails.hardDisk && (
                                  <div className="text-gray-600 group-hover:text-blue-600 transition-colors" title={device.hardwareDetails.hardDisk}>
                                    Disk: {device.hardwareDetails.hardDisk}
                                  </div>
                                )}
                                {device.hardwareDetails.cpu && (
                                  <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
                                    CPU: {device.hardwareDetails.cpu.length > 20 ? device.hardwareDetails.cpu.substring(0, 20) + '...' : device.hardwareDetails.cpu}
                                  </div>
                                )}
                              </div>
                              {device.hardwareChanges && device.hardwareChanges.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedDeviceForHistory(device);
                                    setShowHistoryModal(true);
                                  }}
                                  className="text-xs text-purple-600 hover:text-purple-800 mt-1 underline"
                                >
                                  View History ({device.hardwareChanges.length})
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Not synced</span>
                          )}
                        </td>
                        </>
                      )}
                      {(activeTab === 'printers' || activeTab === 'systems') && (
                        <>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              device.status === 'online' 
                                ? 'bg-green-100 text-green-800' 
                                : device.status === 'offline'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {device.status || 'unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {device.uptimePercentage?.toFixed(1) || 0}%
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4">
                        {device.connectionType === 'IP-based' && device.ipAddress && (
                          <button
                            onClick={() => pingDevice(device._id)}
                            disabled={device.pinging}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 mr-2"
                            title={`Ping ${activeTab === 'systems' ? 'System' : 'Printer'}`}
                          >
                            <FiActivity className={device.pinging ? 'animate-pulse' : ''} />
                          </button>
                        )}
                        {activeTab === 'systems' && device.connectionType === 'IP-based' && device.ipAddress && (
                          <button
                            onClick={() => fetchHardwareDetails(device._id)}
                            disabled={fetchingHardware}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors mr-2 disabled:opacity-50"
                            title="Fetch Hardware Details"
                          >
                            <FiCpu className={fetchingHardware ? 'animate-pulse' : ''} />
                          </button>
                        )}
                        {activeTab === 'systems' && (
                          <button
                            onClick={() => setShowHelpModal(true)}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors mr-2"
                            title="Deployment Instructions"
                          >
                            <FiHelpCircle />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingDevice(device)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => deleteDevice(device._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, devices.length)} of {devices.length} devices
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Agent Setup Instructions</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Installation Steps</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Copy the <code className="bg-blue-100 px-1 rounded">agent</code> folder to the client system</li>
                  <li>Open the folder and run <code className="bg-blue-100 px-1 rounded">gpo-install.ps1</code> as Administrator</li>
                  <li>Agent will install automatically and start on system boot</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Web Application Usage</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open the web application in your browser</li>
                  <li>Go to the <strong>Systems</strong> tab</li>
                  <li>Click the <strong>purple CPU icon</strong> next to any system to fetch hardware details</li>
                  <li>Hardware details (RAM, Hard Disk, CPU, OS, Motherboard) will appear automatically</li>
                  <li>Hover over hardware details to see full information</li>
                  <li>Click <strong>"View History"</strong> to see hardware change history with timestamps</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Note</h4>
                <p>The agent runs on port 8765 and requires network access from this web server. Make sure Windows Firewall allows this port.</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enter Admin Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., admin or bpride.com\\admin"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: username, domain\\username, or username@domain
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter domain password"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  These credentials will be used to enable WinRM and fetch hardware details from the remote system.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCredentials({ username: '', password: '' });
                  setSelectedDeviceId(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCredentialsSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Fetch Hardware
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedDeviceForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Hardware Change History - {selectedDeviceForHistory.deviceName}
            </h3>
            {selectedDeviceForHistory.hardwareChanges && selectedDeviceForHistory.hardwareChanges.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  // Group changes by field
                  const changesByField = selectedDeviceForHistory.hardwareChanges.reduce((acc, change) => {
                    if (!acc[change.field]) {
                      acc[change.field] = [];
                    }
                    acc[change.field].push(change);
                    return acc;
                  }, {} as Record<string, typeof selectedDeviceForHistory.hardwareChanges>);

                  // For RAM, only show the latest change with current value
                  // For other fields, show all changes
                  return Object.entries(changesByField).map(([field, changes]) => {
                    if (field === 'ram') {
                      // Show only the most recent RAM change (current value)
                      const latestChange = changes[changes.length - 1];
                      return (
                        <div key={field} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-gray-900 uppercase">
                              {field}
                            </span>
                            <span className="text-xs text-gray-500">
                              {latestChange.detectedAt instanceof Date
                                ? latestChange.detectedAt.toLocaleString()
                                : new Date(latestChange.detectedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">{latestChange.newValue}</span>
                          </div>
                        </div>
                      );
                    } else {
                      // Show all changes for other fields
                      return changes.map((change, index) => (
                        <div key={`${field}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-gray-900 uppercase">
                              {change.field}
                            </span>
                            <span className="text-xs text-gray-500">
                              {change.detectedAt instanceof Date
                                ? change.detectedAt.toLocaleString()
                                : new Date(change.detectedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-red-600 line-through">{change.oldValue}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 font-medium">{change.newValue}</span>
                          </div>
                        </div>
                      ));
                    }
                  });
                })()}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hardware changes recorded</p>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedDeviceForHistory(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

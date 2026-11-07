'use client';

import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

interface AddDeviceModalProps {
  onClose: () => void;
  onSuccess: () => void;
  type: 'systems' | 'printers';
}

export default function AddDeviceModal({ onClose, onSuccess, type }: AddDeviceModalProps) {
  const [formData, setFormData] = useState({
    deviceName: '',
    building: '',
    department: '',
    connectionType: 'IP-based',
    ipAddress: '',
    defaultGateway: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [filteredDepartments, setFilteredDepartments] = useState<string[]>([]);

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
    setFormData({ ...formData, department: value });
    if (value.length > 0) {
      const filtered = departments.filter(dept =>
        dept.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredDepartments(filtered);
      setShowDeptSuggestions(true);
    } else {
      setShowDeptSuggestions(false);
    }
  };

  const selectDepartment = (dept: string) => {
    setFormData({ ...formData, department: dept });
    setShowDeptSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add device');
      }
    } catch (error) {
      console.error('Failed to add device:', error);
      alert('Failed to add device. Please check if MongoDB is configured.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Add {type === 'systems' ? 'System' : 'Printer'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Name
            </label>
            <input
              type="text"
              required
              value={formData.deviceName}
              onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Server"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building
            </label>
            <input
              type="text"
              required
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Building A"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              required
              value={formData.department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              onFocus={() => {
                if (formData.department.length === 0) {
                  setFilteredDepartments(departments);
                  setShowDeptSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., IT Department"
              autoComplete="off"
            />
            {showDeptSuggestions && filteredDepartments.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredDepartments.map((dept) => (
                  <div
                    key={dept}
                    onClick={() => selectDepartment(dept)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                  >
                    {dept}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <select
              value={formData.connectionType}
              onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="IP-based">IP-based</option>
              <option value="Cable-connected">Cable-connected</option>
            </select>
          </div>

          {formData.connectionType === 'IP-based' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address
                </label>
                <input
                  type="text"
                  required={formData.connectionType === 'IP-based'}
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 172.18.1.100"
                  pattern="^(\d{1,3}\.){3}\d{1,3}$"
                />
              </div>

              {type === 'systems' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Gateway
                    </label>
                    <input
                      type="text"
                      value={formData.defaultGateway}
                      onChange={(e) => setFormData({ ...formData, defaultGateway: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 192.168.1.1"
                      pattern="^(\d{1,3}\.){3}\d{1,3}$"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Password
                    </label>
                    <select
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Password</option>
                      <option value="P@$$C00">P@$$C00</option>
                      <option value="Pride">Pride</option>
                      <option value="com123">com123</option>
                      <option value="Capital.com">Capital.com</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

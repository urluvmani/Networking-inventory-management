'use client';

import { useState } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';

interface LocationSearchProps {
  onLocationSearch: (building: string, department: string) => void;
}

export default function LocationSearch({ onLocationSearch }: LocationSearchProps) {
  const [building, setBuilding] = useState('');
  const [department, setDepartment] = useState('');

  const handleSearch = () => {
    onLocationSearch(building, department);
  };

  const clearSearch = () => {
    setBuilding('');
    setDepartment('');
    onLocationSearch('', '');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FiMapPin className="text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Find Devices by Location
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Building
          </label>
          <input
            type="text"
            placeholder="e.g., Building A"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <input
            type="text"
            placeholder="e.g., IT Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search Location
          </button>
          {(building || department) && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <FiX />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiX } from 'react-icons/fi';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  type: 'systems' | 'printers';
}

export interface SearchFilters {
  query: string;
  building: string;
  department: string;
  ipAddress: string;
  connectionType: string;
  status?: string;
}

export default function SearchBar({ onSearch, type }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    building: '',
    department: '',
    ipAddress: '',
    connectionType: '',
    status: '',
  });
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
    setFilters({ ...filters, department: value });
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
    setFilters({ ...filters, department: dept });
    setShowDeptSuggestions(false);
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      query: '',
      building: '',
      department: '',
      ipAddress: '',
      connectionType: '',
      status: '',
    };
    setFilters(clearedFilters);
    setShowDeptSuggestions(false);
    onSearch(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, building, department, or IP..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <FiFilter />
          Filters
        </button>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <FiX />
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building
            </label>
            <input
              type="text"
              placeholder="e.g., Building A"
              value={filters.building}
              onChange={(e) => setFilters({ ...filters, building: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              placeholder="e.g., IT Department"
              value={filters.department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              onFocus={() => {
                if (filters.department.length === 0) {
                  setFilteredDepartments(departments);
                  setShowDeptSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              IP Address
            </label>
            <input
              type="text"
              placeholder="e.g., 172.18.1.100"
              value={filters.ipAddress}
              onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <select
              value={filters.connectionType}
              onChange={(e) => setFilters({ ...filters, connectionType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="IP-based">IP-based</option>
              <option value="Cable-connected">Cable-connected</option>
            </select>
          </div>

          {type === 'printers' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

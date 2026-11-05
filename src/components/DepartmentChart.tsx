'use client';

interface DepartmentChartProps {
  stats: any;
  activeTab: 'systems' | 'printers';
}

export default function DepartmentChart({ stats, activeTab }: DepartmentChartProps) {
  const data = activeTab === 'systems' ? stats?.systems : stats?.printers;

  if (!data) return null;

  const departmentData = data.byDepartment || {};
  const departments = Object.entries(departmentData);
  const maxCount = Math.max(...Object.values(departmentData).map(v => Number(v)), 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Devices by Department
      </h2>
      {departments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No data available</p>
      ) : (
        <div className="space-y-4">
          {departments.map(([department, count]) => {
            const percentage = (count as number / maxCount) * 100;
            return (
              <div key={department}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">{department}</span>
                  <span className="text-gray-900 font-bold">{String(count)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

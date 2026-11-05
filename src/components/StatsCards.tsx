'use client';

interface StatsCardsProps {
  stats: any;
  activeTab: 'systems' | 'printers';
}

export default function StatsCards({ stats, activeTab }: StatsCardsProps) {
  const data = activeTab === 'systems' ? stats?.systems : stats?.printers;

  if (!data) return null;

  const cards = activeTab === 'systems' ? [
    { label: 'Total Systems', value: data.total, color: 'border-blue-500' },
    { label: 'Online', value: data.online, color: 'border-green-500' },
    { label: 'Offline', value: data.offline, color: 'border-red-500' },
    { label: 'Uptime', value: `${data.uptimePercentage}%`, color: 'border-purple-500' },
  ] : [
    { label: 'Total Printers', value: data.total, color: 'border-blue-500' },
    { label: 'Online', value: data.online, color: 'border-green-500' },
    { label: 'Offline', value: data.offline, color: 'border-red-500' },
    { label: 'Uptime', value: `${data.uptimePercentage}%`, color: 'border-purple-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${card.color}`}
        >
          <p className="text-gray-600 text-sm font-medium mb-2">{card.label}</p>
          <p className="text-3xl font-bold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

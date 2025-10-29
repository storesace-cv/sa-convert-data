import React from 'react';
import { ptPT } from '@/i18n/pt-PT';
import { RulesStatusWidget } from './RulesStatusWidget';

interface DashboardProps {
  stats: {
    total: number;
    normalized: number;
    classified: number;
    duplicates: number;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const quality = Math.round((stats.classified / stats.total) * 100) || 0;
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">{ptPT.dashboard.welcome}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title={ptPT.dashboard.totalItems} value={stats.total} color="blue" />
        <StatCard title={ptPT.dashboard.normalized} value={stats.normalized} color="green" />
        <StatCard title={ptPT.dashboard.classified} value={stats.classified} color="purple" />
        <StatCard title={ptPT.dashboard.duplicates} value={stats.duplicates} color="amber" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">{ptPT.dashboard.quality}</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div className="bg-green-500 h-4 rounded-full transition-all" style={{ width: `${quality}%` }} />
          </div>
          <p className="mt-2 text-gray-600">{quality}% completo</p>
        </div>
        
        <RulesStatusWidget />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }: any) => (
  <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-${color}-500`}>
    <p className="text-gray-600 text-sm">{title}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);

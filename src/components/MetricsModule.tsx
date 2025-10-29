import React from 'react';
import { ItemCanonico } from '@/types/item';

interface MetricsModuleProps {
  items: ItemCanonico[];
  auditLog: any[];
}

export const MetricsModule: React.FC<MetricsModuleProps> = ({ items, auditLog }) => {
  const byType = items.reduce((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byLoja = items.reduce((acc, item) => {
    acc[item.loja_origem] = (acc[item.loja_origem] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Métricas & Auditoria</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Artigos por Tipo</h3>
          {Object.entries(byType).map(([tipo, count]) => (
            <div key={tipo} className="flex justify-between items-center mb-2 pb-2 border-b">
              <span className="text-gray-700">{tipo}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Artigos por Loja</h3>
          {Object.entries(byLoja).map(([loja, count]) => (
            <div key={loja} className="flex justify-between items-center mb-2 pb-2 border-b">
              <span className="text-gray-700">{loja}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Audit Trail (Últimas 10 ações)</h3>
        <div className="space-y-2">
          {auditLog.slice(-10).reverse().map((log, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <span className="font-semibold">{log.action}</span>
                <span className="text-sm text-gray-600 ml-2">por {log.user}</span>
              </div>
              <span className="text-sm text-gray-500">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

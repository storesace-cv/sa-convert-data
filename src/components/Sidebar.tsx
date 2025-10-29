import React from 'react';
import { ptPT } from '@/i18n/pt-PT';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

const modules = [
  { id: 'dashboard', label: ptPT.nav.dashboard, icon: '📊' },
  { id: 'import', label: ptPT.nav.import, icon: '📥' },
  { id: 'data', label: 'Dados', icon: '📋' },
  { id: 'classify', label: ptPT.nav.classify, icon: '🏷️' },
  { id: 'duplicates', label: ptPT.nav.duplicates, icon: '🔍' },
  { id: 'rules', label: 'Regras', icon: '⚙️' },
  { id: 'export', label: ptPT.nav.export, icon: '📤' },
  { id: 'metrics', label: ptPT.nav.metrics, icon: '📈' },
  { id: 'profile', label: 'Perfil', icon: '👤' }
];



export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange }) => {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold">{ptPT.app.title}</h1>
        <p className="text-sm text-slate-400">{ptPT.app.subtitle}</p>
      </div>
      <nav className="flex-1 p-4">
        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => onModuleChange(mod.id)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
              activeModule === mod.id ? 'bg-blue-600' : 'hover:bg-slate-800'
            }`}
          >
            <span className="mr-3">{mod.icon}</span>
            {mod.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};

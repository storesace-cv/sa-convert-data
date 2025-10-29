import React, { useState } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (cmd: string) => void;
}

const commands = [
  { id: 'import', label: 'Importar Ficheiro', icon: '📥', shortcut: '⌘I' },
  { id: 'classify', label: 'Classificar Artigos', icon: '🏷️', shortcut: '' },
  { id: 'duplicates', label: 'Ver Duplicados', icon: '🔍', shortcut: '' },
  { id: 'export', label: 'Exportar Dados', icon: '📤', shortcut: '⌘E' },
  { id: 'save', label: 'Guardar', icon: '💾', shortcut: '⌘S' }
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onCommand }) => {
  const [search, setSearch] = useState('');
  
  if (!isOpen) return null;
  
  const filtered = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50"
      onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Pesquisar comando..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-6 py-4 text-lg border-b focus:outline-none"
          autoFocus
        />
        <div className="max-h-96 overflow-y-auto">
          {filtered.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => { onCommand(cmd.id); onClose(); }}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 text-left"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{cmd.icon}</span>
                <span className="font-medium">{cmd.label}</span>
              </div>
              {cmd.shortcut && <span className="text-gray-400 text-sm">{cmd.shortcut}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

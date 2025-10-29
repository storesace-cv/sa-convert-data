import React, { useState } from 'react';
import { ItemCanonico, ItemType, ClassTag } from '@/types/item';
import { validateTipoForFamiliaSubfamilia } from '@/utils/businessRules';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';

interface DataTableProps {
  items: ItemCanonico[];
  onEdit: (id: string, field: string, value: any) => void;
  onDelete: (id: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ items, onEdit, onDelete }) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = items.filter(item => 
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_antigo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const tipoOptions: ItemType[] = ['COMIDA (INGREDIENTE)', 'BEBIDA (INGREDIENTE)', 'MERCADORIA', 'PRODUCAO', 'VENDA'];
  const classTagOptions: ClassTag[] = ['COMPRA', 'COMPRA/VENDA'];
  
  const getValidTipoOptions = (item: ItemCanonico): ItemType[] => {
    return tipoOptions.filter(tipo => 
      validateTipoForFamiliaSubfamilia(tipo, item.familia, item.subfamilia).valid
    );
  };
  
  const getValidationMessage = (item: ItemCanonico, tipo: ItemType): string | null => {
    const validation = validateTipoForFamiliaSubfamilia(tipo, item.familia, item.subfamilia);
    return validation.valid ? null : validation.reason || null;
  };
  
  const handleTipoChange = (item: ItemCanonico, newTipo: ItemType) => {
    const validation = validateTipoForFamiliaSubfamilia(newTipo, item.familia, item.subfamilia);
    if (validation.valid) {
      onEdit(item.id, 'tipo', newTipo);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Pesquisar (⌘F)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Família</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subfamília</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class Tag</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(item => {
              const validTipos = getValidTipoOptions(item);
              const currentTipoValid = validTipos.includes(item.tipo);
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{item.codigo_antigo}</td>
                  <td className="px-4 py-3 text-sm">{item.descricao}</td>
                  <td className="px-4 py-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <select
                              value={item.tipo}
                              onChange={e => handleTipoChange(item, e.target.value as ItemType)}
                              className={`text-sm border rounded px-2 py-1 ${!currentTipoValid ? 'border-red-500 bg-red-50' : ''}`}
                            >
                              {tipoOptions.map(tipo => (
                                <option key={tipo} value={tipo} disabled={!validTipos.includes(tipo)}>
                                  {tipo}
                                </option>
                              ))}
                            </select>
                            {!currentTipoValid && <AlertCircle className="w-4 h-4 text-red-500" />}
                          </div>
                        </TooltipTrigger>
                        {!currentTipoValid && (
                          <TooltipContent>
                            <p className="text-xs">{getValidationMessage(item, item.tipo)}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.familia || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.subfamilia || '-'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.class_tag}
                      onChange={e => onEdit(item.id, 'class_tag', e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {classTagOptions.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

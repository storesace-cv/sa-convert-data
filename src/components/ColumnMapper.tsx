import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ColumnMapperProps {
  headers: string[];
  mapping: Record<string, number>;
  onChange: (field: string, colIndex: number) => void;
}

const REQUIRED_FIELDS = [
  { key: 'codigo_antigo', label: 'Código Antigo *' },
  { key: 'descricao', label: 'Descrição *' },
  { key: 'unidade', label: 'Unidade *' },
  { key: 'familia', label: 'Família' },
  { key: 'subfamilia', label: 'Subfamília' },
  { key: 'gtin', label: 'GTIN/EAN' },
  { key: 'iva_code', label: 'Código IVA' },
  { key: 'observacoes', label: 'Observações' }
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ headers, mapping, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {REQUIRED_FIELDS.map(field => (
        <div key={field.key}>
          <label className="block text-sm font-medium mb-2">{field.label}</label>
          <Select 
            value={mapping[field.key]?.toString() || ''} 
            onValueChange={(val) => onChange(field.key, parseInt(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar coluna..." />
            </SelectTrigger>
            <SelectContent>
              {headers.map((header, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {header || `Coluna ${idx + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};

import React, { useState } from 'react';
import { ptPT } from '@/i18n/pt-PT';
import { parseExcelFile, mapColumns, ParsedRow } from '@/utils/excelParser';
import { ColumnMapper } from './ColumnMapper';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { v4 as uuidv4 } from 'uuid';
import { generateHash } from '@/utils/normalization';
import { ItemCanonico } from '@/types/item';

interface ImportModuleProps {
  onImport: (data: ItemCanonico[]) => void;
}

export const ImportModule: React.FC<ImportModuleProps> = ({ onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [lojaOrigem, setLojaOrigem] = useState('');
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [importing, setImporting] = useState(false);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      try {
        const rows = await parseExcelFile(selectedFile);
        setRawData(rows);
        setHeaders(rows[0].map((h: any) => String(h || '')));
        setStep('map');
      } catch (error) {
        alert('Erro ao ler ficheiro Excel');
      }
    }
  };
  
  const handleMapComplete = () => {
    const mapped = mapColumns(rawData, mapping);
    setPreview(mapped.slice(0, 200));
    setStep('preview');
  };
  
  const handleImport = async () => {
    if (!lojaOrigem) {
      alert('Selecione a loja de origem');
      return;
    }
    
    setImporting(true);
    const mapped = mapColumns(rawData, mapping);
    const items: ItemCanonico[] = [];
    
    for (const row of mapped) {
      if (row.errors.length > 0) continue;
      
      const item: ItemCanonico = {
        id: uuidv4(),
        codigo_antigo: row.codigo_antigo,
        descricao: row.descricao,
        familia: row.familia || null,
        subfamilia: row.subfamilia || null,
        class_tag: 'COMPRA/VENDA',
        tipo: (!row.familia && !row.subfamilia) ? 'COMIDA (INGREDIENTE)' : 'MERCADORIA',
        gtin: row.gtin || null,
        unidade: row.unidade,
        iva_code: row.iva_code || 'NOR',
        loja_origem: lojaOrigem,
        observacoes: row.observacoes || null,
        hash_normalizado: await generateHash(row),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user',
        updated_by: 'user'
      };
      items.push(item);
    }
    
    onImport(items);
    setImporting(false);
  };
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">{ptPT.import.title}</h2>
      
      {step === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block mb-4">
            <span className="text-gray-700 font-semibold">{ptPT.import.selectFile}</span>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} 
              className="mt-2 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </label>
        </div>
      )}
      
      {step === 'map' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Mapear Colunas</h3>
          <ColumnMapper headers={headers} mapping={mapping} 
            onChange={(field, idx) => setMapping({...mapping, [field]: idx})} />
          <Button onClick={handleMapComplete} className="mt-6">Continuar</Button>
        </div>
      )}
      
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block mb-4">
              <span className="text-gray-700 font-semibold">{ptPT.import.lojaOrigem}</span>
              <select value={lojaOrigem} onChange={e => setLojaOrigem(e.target.value)} 
                className="mt-2 block w-full px-4 py-2 border rounded-lg">
                <option value="">Selecionar...</option>
                <option value="Carpe Diem">Carpe Diem</option>
                <option value="Reformulação">Reformulação</option>
              </select>
            </label>
            <Button onClick={handleImport} disabled={!lojaOrigem || importing}>
              {importing ? 'A importar...' : ptPT.import.import}
            </Button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Pré-visualização (primeiros 200)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Código</th>
                    <th className="text-left p-2">Descrição</th>
                    <th className="text-left p-2">Unidade</th>
                    <th className="text-left p-2">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className={`border-b ${row.errors.length > 0 ? 'bg-red-50' : ''}`}>
                      <td className="p-2">{row.codigo_antigo}</td>
                      <td className="p-2">{row.descricao}</td>
                      <td className="p-2">{row.unidade}</td>
                      <td className="p-2 text-red-600">{row.errors.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ptPT } from '@/i18n/pt-PT';
import { ItemCanonico } from '@/types/item';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { executeRule, RuleExecutionResult } from '@/utils/ruleExecutionEngine';
import { RuleExecutionStatus } from './RuleExecutionStatus';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

interface ExportModuleProps {
  items: ItemCanonico[];
}

export const ExportModule: React.FC<ExportModuleProps> = ({ items }) => {
  const { rules, loading } = useRuleRegistry();
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'jsonl'>('xlsx');
  const [validationResults, setValidationResults] = useState<RuleExecutionResult[]>([]);
  const [canExport, setCanExport] = useState(false);
  
  useEffect(() => {
    if (loading || items.length === 0) return;
    
    const preflightRule = rules.find(r => r.id === 'export_preflight' && r.state === 'prod');
    const ivaRule = rules.find(r => r.id === 'iva_map_defaults' && r.state === 'prod');
    
    const results: RuleExecutionResult[] = [];
    let allValid = true;
    
    if (preflightRule) {
      items.forEach(item => {
        const result = executeRule(preflightRule, item);
        if (!result.success) {
          allValid = false;
        }
        results.push(result);
      });
    }
    
    if (ivaRule) {
      items.forEach(item => {
        const result = executeRule(ivaRule, {
          country: item.loja_origem || 'PT',
          iva_code: item.iva_code
        });
        if (!result.success) {
          allValid = false;
        }
        results.push(result);
      });
    }
    
    setValidationResults(results.slice(0, 10)); // Show first 10
    setCanExport(allValid);
  }, [items, rules, loading]);
  
  const handleExport = () => {
    if (!canExport) return;
    
    const data = items.map(item => ({
      id: item.id,
      codigo_antigo: item.codigo_antigo,
      descricao: item.descricao,
      tipo: item.tipo,
      class_tag: item.class_tag,
      familia: item.familia || '',
      subfamilia: item.subfamilia || '',
      unidade: item.unidade,
      iva_code: item.iva_code,
      gtin: item.gtin || '',
      loja_origem: item.loja_origem,
      'duplicado?': item.duplicado || '',
      observacoes: item.observacoes || ''
    }));
    
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Artigos');
      XLSX.writeFile(wb, `export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadFile(csv, 'export.csv', 'text/csv;charset=utf-8;');
    } else if (format === 'jsonl') {
      const jsonl = data.map(d => JSON.stringify(d)).join('\n');
      downloadFile(jsonl, 'export.jsonl', 'text/plain');
    }
  };
  
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (loading) return <div className="p-8">Carregando regras...</div>;
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">{ptPT.export.title}</h2>
      
      <RuleExecutionStatus results={validationResults} className="mb-6" />
      
      {!canExport && validationResults.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Validação Pré-Exportação Falhou</p>
            <p className="text-sm text-red-700">
              Alguns artigos não passaram nas regras de validação. Corrija os erros antes de exportar.
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <p className="text-gray-600 mb-2">Total de artigos a exportar:</p>
          <p className="text-4xl font-bold">{items.length}</p>
        </div>
        
        <label className="block mb-6">
          <span className="text-gray-700 font-semibold">{ptPT.export.format}</span>
          <select value={format} onChange={e => setFormat(e.target.value as any)}
            className="mt-2 block w-full px-4 py-2 border rounded-lg">
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="jsonl">JSON Lines (.jsonl)</option>
          </select>
        </label>
        
        <Button onClick={handleExport} disabled={items.length === 0 || !canExport}
          className="bg-green-600 hover:bg-green-700">
          {ptPT.export.download}
        </Button>
      </div>
    </div>
  );
};

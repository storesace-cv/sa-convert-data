import * as XLSX from 'xlsx';
import { normalizeDescription, validateGTIN } from './normalization';

export interface ParsedRow {
  codigo_antigo: string;
  descricao: string;
  familia?: string;
  subfamilia?: string;
  unidade: string;
  gtin?: string;
  iva_code?: string;
  observacoes?: string;
  errors: string[];
}

export function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        resolve(rows as any[][]);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function mapColumns(rows: any[][], mapping: Record<string, number>): ParsedRow[] {
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const results: ParsedRow[] = [];
  
  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    
    const errors: string[] = [];
    const codigo = String(row[mapping.codigo_antigo] || '').trim();
    const desc = String(row[mapping.descricao] || '').trim();
    
    if (!codigo) errors.push('Código vazio');
    if (!desc) errors.push('Descrição vazia');
    if (desc.length > 150) errors.push('Descrição excede 150 caracteres');
    
    const gtin = row[mapping.gtin] ? String(row[mapping.gtin]).trim() : '';
    if (gtin && !validateGTIN(gtin)) errors.push('GTIN inválido');
    
    results.push({
      codigo_antigo: codigo,
      descricao: normalizeDescription(desc),
      familia: row[mapping.familia] ? String(row[mapping.familia]).trim() : undefined,
      subfamilia: row[mapping.subfamilia] ? String(row[mapping.subfamilia]).trim() : undefined,
      unidade: row[mapping.unidade] ? String(row[mapping.unidade]).trim() : 'UN',
      gtin: gtin || undefined,
      iva_code: row[mapping.iva_code] ? String(row[mapping.iva_code]).trim() : 'NOR',
      observacoes: row[mapping.observacoes] ? String(row[mapping.observacoes]).trim() : undefined,
      errors
    });
  }
  
  return results;
}

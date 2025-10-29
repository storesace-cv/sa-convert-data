import { ItemCanonico, MapaIVA } from '@/types/item';

export const mockItems: ItemCanonico[] = [
  {
    id: '1', codigo_antigo: 'ING001', descricao: 'AZEITE VIRGEM EXTRA', familia: null, subfamilia: null,
    class_tag: 'COMPRA/VENDA', tipo: 'COMIDA (INGREDIENTE)', gtin: '5601234567890', unidade: 'L',
    iva_code: 'RED', loja_origem: 'Carpe Diem', observacoes: null, hash_normalizado: 'abc123',
    created_at: '2025-01-15', updated_at: '2025-01-15', created_by: 'admin', updated_by: 'admin'
  },
  {
    id: '2', codigo_antigo: 'ING002', descricao: 'TOMATE FRESCO', familia: null, subfamilia: null,
    class_tag: 'COMPRA', tipo: 'COMIDA (INGREDIENTE)', gtin: null, unidade: 'KG',
    iva_code: 'RED', loja_origem: 'Carpe Diem', observacoes: null, hash_normalizado: 'def456',
    created_at: '2025-01-15', updated_at: '2025-01-15', created_by: 'admin', updated_by: 'admin'
  }
];

export const mockIVA: MapaIVA[] = [
  { country: 'PT', iva_code: 'NOR', rate: 23, desc: 'Taxa Normal', saft_map: 'NOR' },
  { country: 'PT', iva_code: 'RED', rate: 13, desc: 'Taxa Reduzida', saft_map: 'RED' },
  { country: 'PT', iva_code: 'INT', rate: 6, desc: 'Taxa Intermédia', saft_map: 'INT' }
];

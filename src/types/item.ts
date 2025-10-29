export type ClassTag = 'COMPRA' | 'COMPRA/VENDA';
export type ItemType = 'COMIDA (INGREDIENTE)' | 'BEBIDA (INGREDIENTE)' | 'MERCADORIA' | 'PRODUCAO' | 'VENDA';
export type Country = 'PT' | 'AO' | 'CV';
export type UserRole = 'operacional' | 'gestor' | 'admin';

export interface ItemCanonico {
  id: string;
  codigo_antigo: string;
  descricao: string;
  familia: string | null;
  subfamilia: string | null;
  class_tag: ClassTag;
  tipo: ItemType;
  gtin: string | null;
  unidade: string;
  iva_code: string;
  loja_origem: string;
  observacoes: string | null;
  hash_normalizado: string;
  duplicado?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface Duplicacao {
  id_original: string;
  id_duplicado: string;
  score: number;
  motivo: string[];
  revisto_por?: string;
  estado: 'pendente' | 'aceite' | 'rejeitado';
}

export interface MapaIVA {
  country: Country;
  iva_code: string;
  rate: number;
  desc: string;
  saft_map?: string;
}

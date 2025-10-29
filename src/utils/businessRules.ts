import { ItemCanonico, ItemType, ClassTag } from '@/types/item';

// Business Rule: família/subfamília logic
export function validateTipoForFamiliaSubfamilia(
  tipo: ItemType,
  familia: string | null,
  subfamilia: string | null
): { valid: boolean; reason?: string } {
  const hasFamiliaSubfamilia = !!(familia || subfamilia);
  
  if (hasFamiliaSubfamilia && tipo === 'COMIDA (INGREDIENTE)') {
    return {
      valid: false,
      reason: 'Artigos COM família/subfamília NÃO podem ser COMIDA (INGREDIENTE)'
    };
  }
  
  if (!hasFamiliaSubfamilia && !['COMIDA (INGREDIENTE)', 'BEBIDA (INGREDIENTE)'].includes(tipo)) {
    return {
      valid: false,
      reason: 'Artigos SEM família/subfamília só podem ser COMIDA (INGREDIENTE) ou BEBIDA (INGREDIENTE)'
    };
  }
  
  return { valid: true };
}

// Rule 315: COMPRA vs COMPRA/VENDA classification
export function applyRule315(item: ItemCanonico): ClassTag {
  const hasFamiliaSubfamilia = !!(item.familia || item.subfamilia);
  return hasFamiliaSubfamilia ? 'COMPRA/VENDA' : 'COMPRA';
}

// Automatic tipo inference
export function inferTipo(item: ItemCanonico): ItemType {
  const hasFamiliaSubfamilia = !!(item.familia || item.subfamilia);
  
  if (!hasFamiliaSubfamilia) {
    const desc = item.descricao.toLowerCase();
    if (desc.includes('bebida') || desc.includes('vinho') || desc.includes('cerveja')) {
      return 'BEBIDA (INGREDIENTE)';
    }
    return 'COMIDA (INGREDIENTE)';
  }
  
  return 'MERCADORIA';
}

// Batch classification with preview
export interface ClassificationPreview {
  item: ItemCanonico;
  changes: {
    tipo?: { old: ItemType; new: ItemType };
    class_tag?: { old: ClassTag; new: ClassTag };
  };
}

export function previewRule315(items: ItemCanonico[]): ClassificationPreview[] {
  return items.map(item => {
    const newClassTag = applyRule315(item);
    const preview: ClassificationPreview = { item, changes: {} };
    
    if (item.class_tag !== newClassTag) {
      preview.changes.class_tag = { old: item.class_tag, new: newClassTag };
    }
    
    return preview;
  }).filter(p => Object.keys(p.changes).length > 0);
}

export function previewAutoTipo(items: ItemCanonico[]): ClassificationPreview[] {
  return items.map(item => {
    const newTipo = inferTipo(item);
    const preview: ClassificationPreview = { item, changes: {} };
    
    if (item.tipo !== newTipo) {
      preview.changes.tipo = { old: item.tipo, new: newTipo };
    }
    
    return preview;
  }).filter(p => Object.keys(p.changes).length > 0);
}

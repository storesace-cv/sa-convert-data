export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeDescription(desc: string): string {
  let normalized = desc.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/[;|^~]/g, '');
  normalized = removeAccents(normalized);
  normalized = normalized.toUpperCase();
  return normalized;
}

export function validateGTIN(gtin: string): boolean {
  if (!gtin || gtin.length === 0) return true;
  if (!/^\d{8,14}$/.test(gtin)) return false;
  
  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop()!;
  const sum = digits.reverse().reduce((acc, digit, idx) => 
    acc + digit * (idx % 2 === 0 ? 3 : 1), 0);
  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

export async function generateHash(item: Partial<any>): Promise<string> {
  const str = [
    normalizeDescription(item.descricao || ''),
    item.unidade || '',
    item.gtin || '',
    item.familia || '',
    item.subfamilia || ''
  ].join('|');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


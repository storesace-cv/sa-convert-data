import { DiffItem } from '@/types/rule';

/**
 * Deep comparison of two objects and generate diff items
 */
export function generateDiff(expected: any, actual: any, path = ''): DiffItem[] {
  const diffs: DiffItem[] = [];

  if (typeof expected !== typeof actual) {
    diffs.push({
      path,
      type: 'changed',
      oldValue: expected,
      newValue: actual
    });
    return diffs;
  }

  if (expected === null || actual === null) {
    if (expected !== actual) {
      diffs.push({ path, type: 'changed', oldValue: expected, newValue: actual });
    }
    return diffs;
  }

  if (typeof expected !== 'object') {
    if (expected !== actual) {
      diffs.push({ path, type: 'changed', oldValue: expected, newValue: actual });
    }
    return diffs;
  }

  const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  allKeys.forEach(key => {
    const newPath = path ? `${path}.${key}` : key;
    const hasExpected = key in expected;
    const hasActual = key in actual;

    if (!hasExpected) {
      diffs.push({ path: newPath, type: 'added', newValue: actual[key] });
    } else if (!hasActual) {
      diffs.push({ path: newPath, type: 'removed', oldValue: expected[key] });
    } else {
      diffs.push(...generateDiff(expected[key], actual[key], newPath));
    }
  });

  return diffs;
}

export function formatDiffValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

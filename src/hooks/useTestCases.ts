import { useState, useEffect } from 'react';
import { TestCase } from '@/types/rule';

const DB_NAME = 'storesace_testcases';
const STORE_NAME = 'testcases';
const DB_VERSION = 1;

export function useTestCases(ruleId?: string) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('ruleId', 'ruleId', { unique: false });
        }
      };
    });
  };

  const loadTestCases = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const request = ruleId 
        ? store.index('ruleId').getAll(ruleId)
        : store.getAll();
      
      request.onsuccess = () => {
        setTestCases(request.result || []);
        setLoading(false);
      };
    } catch (error) {
      console.error('Failed to load test cases:', error);
      setLoading(false);
    }
  };

  const saveTestCase = async (testCase: TestCase) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).put(testCase);
    await loadTestCases();
  };

  const deleteTestCase = async (id: string) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).delete(id);
    await loadTestCases();
  };

  useEffect(() => {
    loadTestCases();
  }, [ruleId]);

  return { testCases, loading, saveTestCase, deleteTestCase, reload: loadTestCases };
}

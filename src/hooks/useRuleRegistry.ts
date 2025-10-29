import { useState, useEffect } from 'react';
import { Rule, RuleState } from '@/types/rule';
import { seedRulesRegistry } from '@/rules/seedRules';


const DB_NAME = 'storesace_rules';
const DB_VERSION = 1;
const STORE_NAME = 'rules';

export function useRuleRegistry() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    initDB();
  }, []);

  const initDB = async () => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB');
      setLoading(false);
    };

    request.onsuccess = async () => {
      const database = request.result;
      setDb(database);
      
      // Seed rules on first load
      try {
        await seedRulesRegistry(database);
      } catch (error) {
        console.error('[Seed] Failed to seed rules:', error);
      }
      
      loadRules(database);
    };


    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('state', 'state', { unique: false });
        store.createIndex('version', 'version', { unique: false });
      }
    };
  };

  const loadRules = async (database: IDBDatabase) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      setRules(request.result);
      setLoading(false);
    };

    request.onerror = () => {
      console.error('Failed to load rules');
      setLoading(false);
    };
  };

  const saveRule = async (rule: Rule): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(rule);

      request.onsuccess = () => {
        loadRules(db);
        resolve();
      };

      request.onerror = () => reject(new Error('Failed to save rule'));
    });
  };

  const deleteRule = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        loadRules(db);
        resolve();
      };

      request.onerror = () => reject(new Error('Failed to delete rule'));
    });
  };

  const getRulesByState = (state: RuleState): Rule[] => {
    return rules.filter(r => r.state === state);
  };

  const getRule = (id: string): Rule | undefined => {
    return rules.find(r => r.id === id);
  };

  const updateRule = async (rule: Rule): Promise<void> => {
    return saveRule({ ...rule, updatedAt: new Date().toISOString() });
  };

  const addRule = async (rule: Rule): Promise<void> => {
    return saveRule(rule);
  };

  return {
    rules,
    loading,
    saveRule,
    addRule,
    updateRule,
    deleteRule,
    getRulesByState,
    getRule,
  };
}



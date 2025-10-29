import { useState, useEffect } from 'react';
import { Rule, RuleHistory, RuleVersion } from '@/types/rule';

const DB_NAME = 'StoresAceDB';
const HISTORY_STORE = 'ruleHistory';

export function useRuleHistory(ruleId: string | null) {
  const [history, setHistory] = useState<RuleHistory | null>(null);
  const [loading, setLoading] = useState(false);

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 3);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          db.createObjectStore(HISTORY_STORE, { keyPath: 'ruleId' });
        }
      };
    });
  };

  const loadHistory = async () => {
    if (!ruleId) return;
    setLoading(true);
    try {
      const db = await openDB();
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.get(ruleId);
      req.onsuccess = () => setHistory(req.result || null);
    } catch (err) {
      console.error('Load history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveVersion = async (rule: Rule, author: string, changeSummary: string, changeType: RuleVersion['changeType']) => {
    const db = await openDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    
    const existingReq = store.get(rule.id);
    existingReq.onsuccess = () => {
      const existing: RuleHistory | undefined = existingReq.result;
      const newVersion: RuleVersion = {
        versionNumber: existing ? existing.currentVersion + 1 : 1,
        rule: JSON.parse(JSON.stringify(rule)),
        author,
        timestamp: new Date().toISOString(),
        changeSummary,
        changeType
      };
      
      const updated: RuleHistory = {
        ruleId: rule.id,
        currentVersion: newVersion.versionNumber,
        versions: existing ? [...existing.versions, newVersion] : [newVersion]
      };
      
      store.put(updated);
      setHistory(updated);
    };
  };

  const rollback = async (versionNumber: number, author: string): Promise<Rule | null> => {
    if (!history) return null;
    const targetVersion = history.versions.find(v => v.versionNumber === versionNumber);
    if (!targetVersion) return null;

    await saveVersion(targetVersion.rule, author, `Rolled back to v${versionNumber}`, 'rollback');
    return targetVersion.rule;
  };

  useEffect(() => {
    loadHistory();
  }, [ruleId]);

  return { history, loading, saveVersion, rollback, reload: loadHistory };
}

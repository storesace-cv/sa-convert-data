import { useState, useEffect } from 'react';
import { ConflictResolutionHistoryEntry, ConflictHistoryFilters } from '@/types/conflictHistory';

const STORAGE_KEY = 'conflict_resolution_history';

export const useConflictResolutionHistory = () => {
  const [history, setHistory] = useState<ConflictResolutionHistoryEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setHistory(parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
        beforeState: {
          ...entry.beforeState,
        },
        afterState: {
          ...entry.afterState,
        }
      })));
    }
  }, []);

  const saveHistory = (entries: ConflictResolutionHistoryEntry[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    setHistory(entries);
  };

  const addEntry = (entry: Omit<ConflictResolutionHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ConflictResolutionHistoryEntry = {
      ...entry,
      id: `resolution-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    const updated = [newEntry, ...history];
    saveHistory(updated);
    return newEntry;
  };

  const undoResolution = (entryId: string) => {
    const entry = history.find(e => e.id === entryId);
    if (!entry || !entry.canUndo) return null;
    
    const updated = history.map(e => 
      e.id === entryId ? { ...e, canUndo: false } : e
    );
    saveHistory(updated);
    return entry.beforeState.rules;
  };

  const filterHistory = (filters: ConflictHistoryFilters) => {
    return history.filter(entry => {
      if (filters.resolutionType && entry.resolutionStrategy !== filters.resolutionType) return false;
      if (filters.dateFrom && entry.timestamp < filters.dateFrom) return false;
      if (filters.dateTo && entry.timestamp > filters.dateTo) return false;
      if (filters.userId && entry.userId !== filters.userId) return false;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return entry.conflictType.toLowerCase().includes(term) ||
               entry.userName.toLowerCase().includes(term) ||
               entry.beforeState.conflictDescription.toLowerCase().includes(term);
      }
      return true;
    });
  };

  return {
    history,
    addEntry,
    undoResolution,
    filterHistory,
  };
};

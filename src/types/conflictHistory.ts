import { Rule } from './rule';

export interface ConflictResolutionHistoryEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  conflictType: string;
  resolutionStrategy: 'merge' | 'adjust_conditions' | 'modify_schedule' | 'change_priority' | 'manual';
  affectedRuleIds: string[];
  beforeState: {
    rules: Rule[];
    conflictDescription: string;
  };
  afterState: {
    rules: Rule[];
    resolutionDescription: string;
  };
  canUndo: boolean;
}

export interface ConflictHistoryFilters {
  resolutionType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  searchTerm?: string;
}

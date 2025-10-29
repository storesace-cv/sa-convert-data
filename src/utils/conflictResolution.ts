import { Rule, RuleConflict } from '../types/rule';
import { detectConflictsForRule } from './realtimeConflictDetector';

export interface ResolutionStrategy {
  id: string;
  name: string;
  description: string;
  type: 'merge' | 'adjust_conditions' | 'modify_schedule' | 'change_priority' | 'manual';
  applicable: boolean;
}

export interface ResolutionPreview {
  originalRules: Rule[];
  modifiedRules: Rule[];
  remainingConflicts: RuleConflict[];
  conflictsResolved: number;
  changesSummary: string[];
}

export function getResolutionStrategies(conflict: RuleConflict, rules: Rule[]): ResolutionStrategy[] {
  const strategies: ResolutionStrategy[] = [];
  
  const rule1 = rules.find(r => r.id === conflict.ruleId);
  const rule2 = rules.find(r => r.id === conflict.conflictingRuleId);
  
  if (!rule1 || !rule2) return strategies;

  // Merge strategy for duplicate logic
  if (conflict.type === 'duplicate_logic') {
    strategies.push({
      id: 'merge',
      name: 'Merge Rules',
      description: 'Combine both rules into a single rule with unified conditions and actions',
      type: 'merge',
      applicable: true
    });
  }

  // Adjust conditions for overlapping conditions
  if (conflict.type === 'overlapping_conditions') {
    strategies.push({
      id: 'adjust_conditions',
      name: 'Adjust Conditions',
      description: 'Modify conditions to make them mutually exclusive',
      type: 'adjust_conditions',
      applicable: true
    });
  }

  // Modify schedule for schedule overlaps
  if (conflict.type === 'schedule_overlap') {
    strategies.push({
      id: 'modify_schedule',
      name: 'Modify Schedules',
      description: 'Adjust schedules to prevent timing conflicts',
      type: 'modify_schedule',
      applicable: true
    });
  }

  // Change priority for priority conflicts
  if (conflict.type === 'priority_conflict') {
    strategies.push({
      id: 'change_priority',
      name: 'Adjust Priorities',
      description: 'Set clear priority order to resolve execution conflicts',
      type: 'change_priority',
      applicable: true
    });
  }

  return strategies;
}

export function mergeRules(rule1: Rule, rule2: Rule): Rule {
  return {
    ...rule1,
    name: `${rule1.name} (Merged)`,
    description: `Merged from: ${rule1.name} and ${rule2.name}`,
    conditions: [...(rule1.conditions || []), ...(rule2.conditions || [])],
    actions: [...(rule1.actions || []), ...(rule2.actions || [])],
    priority: Math.max(rule1.priority || 0, rule2.priority || 0)
  };
}

export function adjustConditions(rule1: Rule, rule2: Rule): { rule1: Rule; rule2: Rule } {
  // Add exclusion conditions to make rules mutually exclusive
  const updatedRule1 = {
    ...rule1,
    conditions: [
      ...(rule1.conditions || []),
      { field: 'excludeRule', operator: '!=', value: rule2.id }
    ]
  };

  const updatedRule2 = {
    ...rule2,
    conditions: [
      ...(rule2.conditions || []),
      { field: 'excludeRule', operator: '!=', value: rule1.id }
    ]
  };

  return { rule1: updatedRule1, rule2: updatedRule2 };
}

export function modifySchedules(rule1: Rule, rule2: Rule): { rule1: Rule; rule2: Rule } {
  const schedule1 = rule1.schedule || {};
  const schedule2 = rule2.schedule || {};

  // Adjust time ranges to not overlap
  const updatedRule1 = {
    ...rule1,
    schedule: {
      ...schedule1,
      endTime: '12:00'
    }
  };

  const updatedRule2 = {
    ...rule2,
    schedule: {
      ...schedule2,
      startTime: '12:01'
    }
  };

  return { rule1: updatedRule1, rule2: updatedRule2 };
}

export function adjustPriorities(rule1: Rule, rule2: Rule): { rule1: Rule; rule2: Rule } {
  return {
    rule1: { ...rule1, priority: (rule1.priority || 0) + 10 },
    rule2: { ...rule2, priority: (rule2.priority || 0) }
  };
}

export function previewResolution(
  strategy: ResolutionStrategy,
  conflict: RuleConflict,
  allRules: Rule[]
): ResolutionPreview {
  const rule1 = allRules.find(r => r.id === conflict.ruleId)!;
  const rule2 = allRules.find(r => r.id === conflict.conflictingRuleId)!;
  
  let modifiedRules = [...allRules];
  const changesSummary: string[] = [];

  if (strategy.type === 'merge') {
    const merged = mergeRules(rule1, rule2);
    modifiedRules = modifiedRules.filter(r => r.id !== rule1.id && r.id !== rule2.id);
    modifiedRules.push(merged);
    changesSummary.push(`Merged "${rule1.name}" and "${rule2.name}" into single rule`);
    changesSummary.push(`Combined ${(rule1.conditions?.length || 0) + (rule2.conditions?.length || 0)} conditions`);
  } else if (strategy.type === 'adjust_conditions') {
    const adjusted = adjustConditions(rule1, rule2);
    modifiedRules = modifiedRules.map(r => 
      r.id === rule1.id ? adjusted.rule1 : r.id === rule2.id ? adjusted.rule2 : r
    );
    changesSummary.push(`Added exclusion conditions to both rules`);
  } else if (strategy.type === 'modify_schedule') {
    const adjusted = modifySchedules(rule1, rule2);
    modifiedRules = modifiedRules.map(r => 
      r.id === rule1.id ? adjusted.rule1 : r.id === rule2.id ? adjusted.rule2 : r
    );
    changesSummary.push(`Adjusted schedules to prevent overlap`);
  } else if (strategy.type === 'change_priority') {
    const adjusted = adjustPriorities(rule1, rule2);
    modifiedRules = modifiedRules.map(r => 
      r.id === rule1.id ? adjusted.rule1 : r.id === rule2.id ? adjusted.rule2 : r
    );
    changesSummary.push(`Increased priority of "${rule1.name}" to ensure proper execution order`);
  }

  // Validate resolution by checking for remaining conflicts
  const remainingConflicts: RuleConflict[] = [];
  modifiedRules.forEach(rule => {
    const conflicts = detectConflictsForRule(rule, modifiedRules.filter(r => r.id !== rule.id));
    remainingConflicts.push(...conflicts);
  });

  return {
    originalRules: [rule1, rule2],
    modifiedRules: modifiedRules.filter(r => 
      r.id === rule1.id || r.id === rule2.id || r.name.includes('Merged')
    ),
    remainingConflicts,
    conflictsResolved: remainingConflicts.length === 0 ? 1 : 0,
    changesSummary
  };
}

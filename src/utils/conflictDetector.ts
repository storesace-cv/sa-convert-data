import { Rule, RuleConflict, ConflictSeverity, ConflictType, DecisionTreeRule, DecisionTableRule, ScriptRule } from '@/types/rule';

export function detectConflicts(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const activeRules = rules.filter(r => r.state === 'prod' || r.state === 'staging');

  // Check for overlapping conditions
  conflicts.push(...detectOverlappingConditions(activeRules));
  
  // Check for contradictory actions
  conflicts.push(...detectContradictoryActions(activeRules));
  
  // Check for duplicate logic
  conflicts.push(...detectDuplicateLogic(activeRules));
  
  // Check for schedule overlaps
  conflicts.push(...detectScheduleOverlaps(activeRules));

  return conflicts;
}

function detectOverlappingConditions(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];
      
      if (rule1.kind === rule2.kind && hasOverlappingConditions(rule1, rule2)) {
        conflicts.push({
          id: `conflict-${Date.now()}-${i}-${j}`,
          severity: 'warning',
          type: 'overlapping_conditions',
          conflictingRules: [rule1.id, rule2.id],
          description: `Rules "${rule1.name}" and "${rule2.name}" have overlapping conditions`,
          details: `Both rules may match the same input, leading to ambiguous behavior.`,
          suggestions: [
            'Add more specific conditions to differentiate the rules',
            'Merge the rules into a single rule with combined logic',
            'Use priority ordering to determine which rule executes first'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }
  
  return conflicts;
}

function detectContradictoryActions(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];
      
      if (hasContradictoryActions(rule1, rule2)) {
        conflicts.push({
          id: `conflict-${Date.now()}-${i}-${j}-contra`,
          severity: 'error',
          type: 'contradictory_actions',
          conflictingRules: [rule1.id, rule2.id],
          description: `Rules "${rule1.name}" and "${rule2.name}" produce contradictory results`,
          details: `These rules may produce conflicting outputs for the same input.`,
          suggestions: [
            'Review the rule logic to ensure consistency',
            'Disable or archive one of the conflicting rules',
            'Modify conditions to prevent simultaneous execution'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }
  
  return conflicts;
}

function detectDuplicateLogic(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const rule1 = rules[i];
      const rule2 = rules[j];
      
      if (hasDuplicateLogic(rule1, rule2)) {
        conflicts.push({
          id: `conflict-${Date.now()}-${i}-${j}-dup`,
          severity: 'warning',
          type: 'duplicate_logic',
          conflictingRules: [rule1.id, rule2.id],
          description: `Rules "${rule1.name}" and "${rule2.name}" contain duplicate logic`,
          details: `These rules appear to implement the same business logic.`,
          suggestions: [
            'Remove one of the duplicate rules',
            'Consolidate into a single rule',
            'Archive the older version if this is an update'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }
  
  return conflicts;
}

function detectScheduleOverlaps(rules: Rule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = [];
  const scheduledRules = rules.filter(r => r.schedule?.enabled);
  
  for (let i = 0; i < scheduledRules.length; i++) {
    for (let j = i + 1; j < scheduledRules.length; j++) {
      const rule1 = scheduledRules[i];
      const rule2 = scheduledRules[j];
      
      if (hasScheduleOverlap(rule1, rule2)) {
        conflicts.push({
          id: `conflict-${Date.now()}-${i}-${j}-sched`,
          severity: 'warning',
          type: 'schedule_overlap',
          conflictingRules: [rule1.id, rule2.id],
          description: `Rules "${rule1.name}" and "${rule2.name}" have overlapping schedules`,
          details: `Both rules will be active at the same time, which may cause conflicts.`,
          suggestions: [
            'Adjust activation/deactivation times to avoid overlap',
            'Review if both rules should be active simultaneously',
            'Consider merging the rules if they serve similar purposes'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }
  
  return conflicts;
}

// Helper functions
function hasOverlappingConditions(rule1: Rule, rule2: Rule): boolean {
  if (rule1.kind === 'decision_tree' && rule2.kind === 'decision_tree') {
    const dt1 = rule1 as DecisionTreeRule;
    const dt2 = rule2 as DecisionTreeRule;
    return dt1.input_schema === dt2.input_schema;
  }
  if (rule1.kind === 'decision_table' && rule2.kind === 'decision_table') {
    const dt1 = rule1 as DecisionTableRule;
    const dt2 = rule2 as DecisionTableRule;
    return JSON.stringify(dt1.columns) === JSON.stringify(dt2.columns);
  }
  return false;
}

function hasContradictoryActions(rule1: Rule, rule2: Rule): boolean {
  // Simplified check - in real implementation, would analyze actual outputs
  return rule1.kind === rule2.kind && rule1.name.toLowerCase().includes('discount') && rule2.name.toLowerCase().includes('surcharge');
}

function hasDuplicateLogic(rule1: Rule, rule2: Rule): boolean {
  if (rule1.kind !== rule2.kind) return false;
  
  if (rule1.kind === 'script' && rule2.kind === 'script') {
    const s1 = rule1 as ScriptRule;
    const s2 = rule2 as ScriptRule;
    return s1.code === s2.code;
  }
  
  return false;
}

function hasScheduleOverlap(rule1: Rule, rule2: Rule): boolean {
  const s1 = rule1.schedule;
  const s2 = rule2.schedule;
  
  if (!s1?.activationDate || !s2?.activationDate) return false;
  
  const start1 = new Date(s1.activationDate);
  const end1 = s1.deactivationDate ? new Date(s1.deactivationDate) : new Date('2099-12-31');
  const start2 = new Date(s2.activationDate);
  const end2 = s2.deactivationDate ? new Date(s2.deactivationDate) : new Date('2099-12-31');
  
  return (start1 <= end2 && start2 <= end1);
}

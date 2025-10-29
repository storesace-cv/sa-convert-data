import { Rule, RuleConflict } from '@/types/rule';
import { detectConflicts } from './conflictDetector';

/**
 * Detects conflicts for a single rule against all existing rules
 * Used for real-time conflict detection in the rule editor
 */
export function detectConflictsForRule(
  currentRule: Partial<Rule>,
  existingRules: Rule[],
  excludeRuleId?: string
): RuleConflict[] {
  // Filter out the current rule if editing (to avoid self-conflicts)
  const otherRules = existingRules.filter(r => r.id !== excludeRuleId);
  
  // Create a temporary rule object for conflict detection
  const tempRule: Rule = {
    id: currentRule.id || 'temp_rule',
    name: currentRule.name || 'Untitled Rule',
    description: currentRule.description || '',
    version: currentRule.version || '1.0.0',
    author: currentRule.author || 'Current User',
    createdAt: currentRule.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    state: currentRule.state || 'draft',
    kind: currentRule.kind || 'decision_tree',
    tags: currentRule.tags || [],
    schedule: currentRule.schedule,
    ...(currentRule as any) // Spread other rule-specific properties
  };

  // Only check conflicts if the rule is being promoted to staging or prod
  if (tempRule.state === 'draft') {
    return [];
  }

  // Run conflict detection with the temp rule and existing rules
  const allRules = [...otherRules, tempRule];
  const allConflicts = detectConflicts(allRules);
  
  // Filter to only conflicts involving the current rule
  return allConflicts.filter(conflict => 
    conflict.conflictingRules.includes(tempRule.id)
  );
}

/**
 * Checks if a rule can be saved based on conflict severity
 * Returns true if save is allowed, false if blocked
 */
export function canSaveWithConflicts(conflicts: RuleConflict[]): boolean {
  // Block save if there are any error-level conflicts
  return !conflicts.some(c => c.severity === 'error');
}

/**
 * Checks if a rule can be promoted to production
 * More strict than canSaveWithConflicts
 */
export function canPromoteToProduction(conflicts: RuleConflict[]): boolean {
  // Block promotion if there are any conflicts at all
  return conflicts.length === 0;
}

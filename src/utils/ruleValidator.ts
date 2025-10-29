import { Rule, RuleValidationResult, DecisionTreeRule, DecisionTableRule, ScriptRule } from '@/types/rule';

export class RuleValidator {
  validate(rule: Rule): RuleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validations
    if (!rule.id || rule.id.trim() === '') {
      errors.push('Rule ID is required');
    }
    if (!rule.name || rule.name.trim() === '') {
      errors.push('Rule name is required');
    }
    if (!rule.version || !this.isValidSemver(rule.version)) {
      errors.push('Valid semantic version is required (e.g., 1.0.0)');
    }

    // Kind-specific validations
    switch (rule.kind) {
      case 'decision_tree':
        this.validateDecisionTree(rule, errors, warnings);
        break;
      case 'decision_table':
        this.validateDecisionTable(rule, errors, warnings);
        break;
      case 'script':
        this.validateScript(rule, errors, warnings);
        break;
      default:
        errors.push(`Unknown rule kind: ${(rule as any).kind}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateDecisionTree(rule: DecisionTreeRule, errors: string[], warnings: string[]): void {
    if (!rule.nodes || rule.nodes.length === 0) {
      errors.push('Decision tree must have at least one node');
      return;
    }

    const hasRoot = rule.nodes.some(n => n.id === 'root');
    if (!hasRoot) {
      errors.push('Decision tree must have a root node');
    }

    const nodeIds = new Set(rule.nodes.map(n => n.id));
    const referencedIds = new Set<string>();

    for (const node of rule.nodes) {
      if (node.then && 'goto' in node.then) {
        referencedIds.add(node.then.goto);
      }
      if (node.else && 'goto' in node.else) {
        referencedIds.add(node.else.goto);
      }
    }

    // Check for unreachable nodes
    for (const id of nodeIds) {
      if (id !== 'root' && !referencedIds.has(id)) {
        warnings.push(`Node "${id}" is unreachable`);
      }
    }

    // Check for invalid references
    for (const id of referencedIds) {
      if (!nodeIds.has(id)) {
        errors.push(`Node references non-existent node: "${id}"`);
      }
    }
  }

  private validateDecisionTable(rule: DecisionTableRule, errors: string[], warnings: string[]): void {
    if (!rule.columns || rule.columns.length < 2) {
      errors.push('Decision table must have at least 2 columns');
    }
    if (!rule.rows || rule.rows.length === 0) {
      errors.push('Decision table must have at least one row');
    }

    if (rule.rows) {
      for (let i = 0; i < rule.rows.length; i++) {
        if (rule.rows[i].length !== rule.columns.length) {
          errors.push(`Row ${i} has ${rule.rows[i].length} values but ${rule.columns.length} columns defined`);
        }
      }
    }
  }

  private validateScript(rule: ScriptRule, errors: string[], warnings: string[]): void {
    if (!rule.code || rule.code.trim() === '') {
      errors.push('Script code is required');
    }

    // Check for dangerous patterns
    const dangerous = ['eval', 'Function(', 'setTimeout', 'setInterval', 'fetch', 'XMLHttpRequest'];
    for (const pattern of dangerous) {
      if (rule.code.includes(pattern)) {
        errors.push(`Script contains forbidden pattern: ${pattern}`);
      }
    }
  }

  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }
}

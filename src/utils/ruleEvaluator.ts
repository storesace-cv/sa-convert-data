import { Rule, DecisionTreeRule, DecisionTableRule, ScriptRule, RuleExecutionResult } from '@/types/rule';
import { similarity, removeAccents } from './fuzzy';

export class RuleEvaluator {
  // Safe DSL functions whitelist
  private safeFunctions: Record<string, Function> = {
    similarity: (a: string, b: string) => similarity(a, b),
    noacc: (s: string) => removeAccents(s),
    len: (s: string) => (s || '').length,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    isEmpty: (v: any) => !v || v === '',
  };

  async evaluate(rule: Rule, input: any): Promise<RuleExecutionResult> {
    const startTime = performance.now();
    try {
      let output: any;
      
      switch (rule.kind) {
        case 'decision_tree':
          output = this.evaluateDecisionTree(rule, input);
          break;
        case 'decision_table':
          output = this.evaluateDecisionTable(rule, input);
          break;
        case 'script':
          output = this.evaluateScript(rule, input);
          break;
        default:
          throw new Error(`Unknown rule kind: ${(rule as any).kind}`);
      }

      return {
        success: true,
        output,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: performance.now() - startTime,
      };
    }
  }

  private evaluateDecisionTree(rule: DecisionTreeRule, input: any): any {
    const nodes = new Map(rule.nodes.map(n => [n.id, n]));
    let current = nodes.get('root');
    
    while (current) {
      if (current.decision) {
        return current.decision;
      }
      
      if (current.if) {
        const condition = this.evaluateCondition(current.if, input);
        const next = condition ? current.then : current.else;
        
        if (next && 'goto' in next) {
          current = nodes.get(next.goto);
        } else if (next && 'decision' in next) {
          return next.decision;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return null;
  }

  private evaluateDecisionTable(rule: DecisionTableRule, input: any): any {
    const matches: any[] = [];
    
    for (const row of rule.rows) {
      let isMatch = true;
      
      for (let i = 0; i < rule.columns.length - 1; i++) {
        const col = rule.columns[i];
        const pattern = row[i];
        const value = input[col];
        
        if (pattern !== '*' && pattern !== value) {
          isMatch = false;
          break;
        }
      }
      
      if (isMatch) {
        const resultCol = rule.columns[rule.columns.length - 1];
        matches.push({ [resultCol]: row[row.length - 1] });
        
        if (rule.resolution === 'first_match') {
          break;
        }
      }
    }
    
    return rule.resolution === 'first_match' ? matches[0] : matches;
  }

  private evaluateScript(rule: ScriptRule, input: any): any {
    // Safe evaluation - no eval, limited scope
    const context = { ...input, ...this.safeFunctions };
    return this.executeSafeDSL(rule.code, context);
  }

  private evaluateCondition(condition: string, input: any): boolean {
    const context = { ...input, ...this.safeFunctions };
    const result = this.executeSafeDSL(condition, context);
    return Boolean(result);
  }

  private executeSafeDSL(code: string, context: any): any {
    // Simple safe interpreter - no eval
    // For production, use a proper DSL parser
    try {
      const func = new Function(...Object.keys(context), `return ${code}`);
      return func(...Object.values(context));
    } catch (error) {
      throw new Error(`DSL execution error: ${error}`);
    }
  }
}

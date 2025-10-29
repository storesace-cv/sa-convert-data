import { Rule } from '@/types/rule';
import { similarityScore } from './fuzzy';

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  success: boolean;
  output: any;
  error?: string;
  executionTime: number;
}

// Execute a decision tree rule
export function executeDecisionTree(rule: Rule, input: any): RuleExecutionResult {
  const startTime = performance.now();
  
  try {
    const nodes = rule.nodes || [];
    let currentNode = nodes.find(n => n.id === 'root');
    
    if (!currentNode) {
      throw new Error('No root node found');
    }
    
    // Navigate the tree
    while (currentNode) {
      if (currentNode.decision) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          success: true,
          output: currentNode.decision,
          executionTime: performance.now() - startTime
        };
      }
      
      if (currentNode.if && currentNode.then && currentNode.else) {
        const conditionMet = evaluateCondition(currentNode.if, input);
        const nextNodeId = conditionMet ? currentNode.then.goto : currentNode.else.goto;
        currentNode = nodes.find(n => n.id === nextNodeId);
      } else {
        break;
      }
    }
    
    throw new Error('No decision reached');
  } catch (error: any) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: false,
      output: null,
      error: error.message,
      executionTime: performance.now() - startTime
    };
  }
}

// Execute a decision table rule
export function executeDecisionTable(rule: Rule, input: any): RuleExecutionResult {
  const startTime = performance.now();
  
  try {
    const rows = rule.rows || [];
    
    for (const row of rows) {
      if (matchesConditions(row.conditions, input)) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          success: true,
          output: row.outputs,
          executionTime: performance.now() - startTime
        };
      }
    }
    
    throw new Error('No matching row found');
  } catch (error: any) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: false,
      output: null,
      error: error.message,
      executionTime: performance.now() - startTime
    };
  }
}

// Execute a script rule (dedupe_score)
export function executeScript(rule: Rule, input: any): RuleExecutionResult {
  const startTime = performance.now();
  
  try {
    if (rule.id === 'dedupe_score') {
      const item1 = input.item1;
      const item2 = input.item2;
      
      if (!item1 || !item2) {
        throw new Error('Missing item1 or item2');
      }
      
      // Base similarity score
      let score = similarityScore(item1.descricao, item2.descricao);
      
      // Positive weights
      if (item1.gtin && item2.gtin && item1.gtin === item2.gtin) score += 10;
      if (item1.familia && item2.familia && item1.familia === item2.familia) score += 5;
      if (item1.subfamilia && item2.subfamilia && item1.subfamilia === item2.subfamilia) score += 5;
      if (item1.unidade && item2.unidade && item1.unidade === item2.unidade) score += 3;
      if (item1.loja_origem && item2.loja_origem && item1.loja_origem === item2.loja_origem) score += 2;
      
      // Cap at 100
      score = Math.min(score, 100);
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: true,
        output: { score: Math.round(score) },
        executionTime: performance.now() - startTime
      };
    }
    
    throw new Error('Unknown script rule');
  } catch (error: any) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      success: false,
      output: null,
      error: error.message,
      executionTime: performance.now() - startTime
    };
  }
}

// Main execution dispatcher
export function executeRule(rule: Rule, input: any): RuleExecutionResult {
  switch (rule.kind) {
    case 'decision_tree':
      return executeDecisionTree(rule, input);
    case 'decision_table':
      return executeDecisionTable(rule, input);
    case 'script':
      return executeScript(rule, input);
    default:
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        output: null,
        error: `Unknown rule kind: ${rule.kind}`,
        executionTime: 0
      };
  }
}

// Evaluate condition string
function evaluateCondition(condition: string, input: any): boolean {
  if (condition.includes('isEmpty')) {
    const match = condition.match(/isEmpty\((\w+)\)/);
    if (match) {
      const field = match[1];
      return !input[field] || input[field] === '';
    }
  }
  
  if (condition.includes('==')) {
    const [left, right] = condition.split('==').map(s => s.trim());
    const leftVal = input[left.trim()];
    const rightVal = right.replace(/['"]/g, '');
    return String(leftVal) === rightVal;
  }
  
  if (condition.includes('&&')) {
    const parts = condition.split('&&');
    return parts.every(part => evaluateCondition(part.trim(), input));
  }
  
  return !!input[condition.trim()];
}

// Match decision table conditions
function matchesConditions(conditions: Record<string, any>, input: any): boolean {
  return Object.entries(conditions).every(([key, value]) => {
    if (value === '*') return true;
    return input[key] === value;
  });
}

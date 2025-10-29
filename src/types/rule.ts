// Rule type definitions for Dynamic Rules Engine

export type RuleState = 'draft' | 'staging' | 'prod' | 'archived';
export type RuleKind = 'decision_tree' | 'decision_table' | 'script';

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RuleSchedule {
  enabled: boolean;
  activationDate?: string; // ISO 8601 datetime
  deactivationDate?: string; // ISO 8601 datetime
  recurrence?: RecurrencePattern;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  notifyBefore?: number; // minutes before activation/deactivation
}

export interface RuleMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  state: RuleState;
  tags?: string[];
  schedule?: RuleSchedule;
}


export interface DecisionTreeNode {
  id: string;
  if?: string;
  then?: { goto: string } | { decision: any };
  else?: { goto: string } | { decision: any };
  decision?: any;
}

export interface DecisionTreeRule extends RuleMetadata {
  kind: 'decision_tree';
  input_schema: string;
  output_schema: string;
  nodes: DecisionTreeNode[];
  tests?: RuleTest[];
}

export interface DecisionTableRule extends RuleMetadata {
  kind: 'decision_table';
  columns: string[];
  rows: any[][];
  resolution: 'first_match' | 'all_matches';
  tests?: RuleTest[];
}

export interface ScriptRule extends RuleMetadata {
  kind: 'script';
  language: 'safe-dsl';
  code: string;
  tests?: RuleTest[];
}

export type Rule = DecisionTreeRule | DecisionTableRule | ScriptRule;

export interface RuleTest {
  name: string;
  input: any;
  expect: any;
}

export interface RuleExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime?: number;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}


// Test case and result types for TestBench
export interface TestCase {
  id: string;
  ruleId: string;
  name: string;
  description?: string;
  input: any;
  expectedOutput: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface TestResult {
  testCaseId: string;
  testCaseName: string;
  passed: boolean;
  input: any;
  expectedOutput: any;
  actualOutput: any;
  executionTime: number;
  error?: string;
  diff?: DiffItem[];
  timestamp: string;
}

export interface DiffItem {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  oldValue?: any;
  newValue?: any;
}

export interface TestReport {
  ruleId: string;
  ruleName: string;
  ruleVersion: string;
  totalTests: number;
  passed: number;
  failed: number;
  totalExecutionTime: number;
  results: TestResult[];
  generatedAt: string;
}

// Version history types
export interface RuleVersion {
  versionNumber: number;
  rule: Rule;
  author: string;
  timestamp: string;
  changeSummary: string;
  changeType: 'created' | 'updated' | 'state_change' | 'rollback';
}

export interface RuleHistory {
  ruleId: string;
  currentVersion: number;
  versions: RuleVersion[];
}


// Approval workflow types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalStage = 'draft_to_staging' | 'staging_to_production';
export type ApproverRole = 'admin' | 'manager' | 'senior_engineer' | 'qa_lead';

export interface ApprovalRequest {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleVersion: string;
  requestedBy: string;
  requestedAt: string;
  stage: ApprovalStage;
  fromState: RuleState;
  toState: RuleState;
  status: ApprovalStatus;
  requiredApprovers: ApproverRole[];
  approvals: Approval[];
  comments?: string;
}

export interface Approval {
  id: string;
  approvalRequestId: string;
  approver: string;
  approverRole: ApproverRole;
  status: ApprovalStatus;
  comments?: string;
  timestamp: string;
}

export interface ApprovalTimeline {
  id: string;
  ruleId: string;
  requestId: string;
  action: 'requested' | 'approved' | 'rejected' | 'completed';
  actor: string;
  actorRole?: ApproverRole;
  timestamp: string;
  comments?: string;
  fromState?: RuleState;
  toState?: RuleState;
}






// Rule Template types
export type TemplateCategory = 'pricing' | 'inventory' | 'shipping' | 'validation' | 'general';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  ruleConfig: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
}


// Rule Conflict Detection types
export type ConflictSeverity = 'warning' | 'error';
export type ConflictType = 'overlapping_conditions' | 'contradictory_actions' | 'duplicate_logic' | 'priority_conflict' | 'schedule_overlap';

export interface RuleConflict {
  id: string;
  severity: ConflictSeverity;
  type: ConflictType;
  conflictingRules: string[]; // Rule IDs
  description: string;
  details: string;
  suggestions: string[];
  detectedAt: string;
}

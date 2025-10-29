import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { DecisionTreeEditor } from './DecisionTreeEditor';
import { DecisionTableEditor } from './DecisionTableEditor';
import { ScriptEditor } from './ScriptEditor';
import { ScheduleEditor } from './ScheduleEditor';
import { ConflictWarning } from './ConflictWarning';
import { Rule, RuleKind, RuleState, RuleSchedule, DecisionTreeNode, RuleConflict } from '../types/rule';
import { Save, X, Eye, AlertCircle } from 'lucide-react';
import { detectConflictsForRule, canSaveWithConflicts } from '@/utils/realtimeConflictDetector';


interface RuleEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  rule?: Rule;
  mode: 'create' | 'edit';
  existingRules: Rule[];
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ open, onClose, onSave, rule, mode, existingRules }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<RuleKind>('decision_tree');
  const [state, setState] = useState<RuleState>('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<RuleSchedule>({ enabled: false });
  
  // Decision Tree
  const [nodes, setNodes] = useState<DecisionTreeNode[]>([]);
  const [inputSchema, setInputSchema] = useState('');
  const [outputSchema, setOutputSchema] = useState('');
  
  // Decision Table
  const [columns, setColumns] = useState<string[]>(['Condition', 'Action']);
  const [rows, setRows] = useState<any[][]>([['', '']]);
  const [resolution, setResolution] = useState<'first_match' | 'all_matches'>('first_match');
  
  // Script
  const [code, setCode] = useState('');
  
  const [errors, setErrors] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<RuleConflict[]>([]);


  useEffect(() => {
    if (rule && mode === 'edit') {
      setName(rule.name);
      setDescription(rule.description || '');
      setKind(rule.kind);
      setState(rule.state);
      setTags(rule.tags || []);
      setSchedule(rule.schedule || { enabled: false });
      
      if (rule.kind === 'decision_tree') {
        setNodes(rule.nodes);
        setInputSchema(rule.input_schema);
        setOutputSchema(rule.output_schema);
      } else if (rule.kind === 'decision_table') {
        setColumns(rule.columns);
        setRows(rule.rows);
        setResolution(rule.resolution);
      } else if (rule.kind === 'script') {
        setCode(rule.code);
      }
    }
  }, [rule, mode]);

  // Real-time conflict detection
  useEffect(() => {
    if (!name || !kind) return;
    
    const currentRuleData: Partial<Rule> = {
      id: rule?.id,
      name,
      description,
      kind,
      state,
      tags,
      schedule: schedule.enabled ? schedule : undefined,
      version: rule?.version || '1.0.0',
      author: rule?.author || 'Current User',
      createdAt: rule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (kind === 'decision_tree') {
      (currentRuleData as any).nodes = nodes;
      (currentRuleData as any).input_schema = inputSchema;
      (currentRuleData as any).output_schema = outputSchema;
    } else if (kind === 'decision_table') {
      (currentRuleData as any).columns = columns;
      (currentRuleData as any).rows = rows;
      (currentRuleData as any).resolution = resolution;
    } else if (kind === 'script') {
      (currentRuleData as any).code = code;
      (currentRuleData as any).language = 'safe-dsl';
    }

    const detectedConflicts = detectConflictsForRule(
      currentRuleData,
      existingRules,
      rule?.id
    );
    
    setConflicts(detectedConflicts);
  }, [name, description, kind, state, tags, schedule, nodes, inputSchema, outputSchema, columns, rows, resolution, code, existingRules, rule?.id]);


  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required');
    if (kind === 'decision_tree' && nodes.length === 0) errs.push('At least one node required');
    if (kind === 'decision_table' && rows.length === 0) errs.push('At least one row required');
    if (kind === 'script' && !code.trim()) errs.push('Script code is required');
    
    // Check for error-level conflicts
    if (!canSaveWithConflicts(conflicts)) {
      errs.push('Critical conflicts must be resolved before saving');
    }
    
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const baseRule = {
      id: rule?.id || `rule_${Date.now()}`,
      name,
      description,
      version: rule?.version || '1.0.0',
      author: rule?.author || 'Current User',
      createdAt: rule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state,
      tags,
      schedule: schedule.enabled ? schedule : undefined,
    };


    let newRule: Rule;
    if (kind === 'decision_tree') {
      newRule = { ...baseRule, kind, input_schema: inputSchema, output_schema: outputSchema, nodes };
    } else if (kind === 'decision_table') {
      newRule = { ...baseRule, kind, columns, rows, resolution };
    } else {
      newRule = { ...baseRule, kind, language: 'safe-dsl' as const, code };
    }

    onSave(newRule);
    onClose();
  };


  const generateJSON = () => {
    const baseRule = { name, description, kind, state, tags };
    if (kind === 'decision_tree') return { ...baseRule, input_schema: inputSchema, output_schema: outputSchema, nodes };
    if (kind === 'decision_table') return { ...baseRule, columns, rows, resolution };
    return { ...baseRule, language: 'safe-dsl', code };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Rule' : 'Edit Rule'}</DialogTitle>
        </DialogHeader>

        {/* Real-time conflict warnings */}
        <ConflictWarning conflicts={conflicts} />

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="preview">JSON Preview</TabsTrigger>
          </TabsList>


          <TabsContent value="basic" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rule Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter rule name" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this rule does" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rule Kind *</label>
                <Select value={kind} onValueChange={(v: RuleKind) => setKind(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decision_tree">Decision Tree</SelectItem>
                    <SelectItem value="decision_table">Decision Table</SelectItem>
                    <SelectItem value="script">Script</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Select value={state} onValueChange={(v: RuleState) => setState(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="config" className="space-y-4">
            {kind === 'decision_tree' && (
              <DecisionTreeEditor
                nodes={nodes}
                onChange={setNodes}
                inputSchema={inputSchema}
                outputSchema={outputSchema}
                onInputSchemaChange={setInputSchema}
                onOutputSchemaChange={setOutputSchema}
              />
            )}
            {kind === 'decision_table' && (
              <DecisionTableEditor
                columns={columns}
                rows={rows}
                resolution={resolution}
                onColumnsChange={setColumns}
                onRowsChange={setRows}
                onResolutionChange={setResolution}
              />
            )}
            {kind === 'script' && <ScriptEditor code={code} onChange={setCode} />}

          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card className="p-4">
              <ScheduleEditor schedule={schedule} onChange={setSchedule} />
            </Card>
          </TabsContent>

          <TabsContent value="preview">

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4" />
                <h3 className="font-medium">Generated JSON Configuration</h3>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(generateJSON(), null, 2)}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

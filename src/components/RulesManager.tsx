import { useState } from 'react';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { useApprovals } from '@/hooks/useApprovals';
import { useTemplates } from '@/hooks/useTemplates';
import { useScheduledRules } from '@/hooks/useScheduledRules';
import { Rule, RuleState, ApproverRole, RuleTemplate, TemplateCategory } from '@/types/rule';


import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Play, Edit, Trash2, Copy, Clock, Send, BookTemplate, Save, Upload, Download, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';


import { TestBench } from './TestBench';
import { VersionHistory } from './VersionHistory';
import { ApprovalsTab } from './ApprovalsTab';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { TemplateGallery } from './TemplateGallery';
import { RuleEditor } from './RuleEditor';
import { RuleImportModule } from './RuleImportModule';
import { RuleExportModule } from './RuleExportModule';
import { ScheduleTab } from './ScheduleTab';
import { ConflictsTab } from './ConflictsTab';
import { Input } from './ui/input';
import { Label } from './ui/label';


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export function RulesManager() {
  const { rules, loading, deleteRule, updateRule, addRule } = useRuleRegistry();
  const { createApprovalRequest, getRequestsByRule, getPendingApprovals } = useApprovals();
  const { templates, addTemplate, deleteTemplate, incrementUsage } = useTemplates();
  const [selectedTab, setSelectedTab] = useState<'rules' | 'approvals' | 'templates' | 'schedule' | 'conflicts'>('rules');

  const [selectedState, setSelectedState] = useState<RuleState>('prod');
  const [testingRule, setTestingRule] = useState<Rule | null>(null);
  const [historyRule, setHistoryRule] = useState<Rule | null>(null);
  const [approvalRule, setApprovalRule] = useState<Rule | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [requiredRoles, setRequiredRoles] = useState<ApproverRole[]>(['manager']);
  
  // Rule Editor state

  
  // Rule Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined);
  
  // Template state
  const [saveAsTemplateRule, setSaveAsTemplateRule] = useState<Rule | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('general');

  // Import/Export state
  const [showImportModule, setShowImportModule] = useState(false);
  const [showExportModule, setShowExportModule] = useState(false);
  
  // Bulk operations state
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [showBulkApprovalDialog, setShowBulkApprovalDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [showBulkStateChangeDialog, setShowBulkStateChangeDialog] = useState(false);
  const [bulkTargetState, setBulkTargetState] = useState<RuleState>('staging');
  const [bulkComments, setBulkComments] = useState('');


  const filteredRules = rules.filter(r => r.state === selectedState);

  const getApprovalStatus = (ruleId: string) => {
    const requests = getRequestsByRule(ruleId);
    const pending = requests.find(r => r.status === 'pending');
    if (pending) return { status: 'pending', badge: <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge> };
    return null;
  };

  const handleRequestApproval = async () => {
    if (!approvalRule) return;
    const toState = approvalRule.state === 'draft' ? 'staging' : 'prod';
    await createApprovalRequest(
      approvalRule.id,
      approvalRule.name,
      approvalRule.version,
      approvalRule.state,
      toState as RuleState,
      approvalRule.author || 'Unknown',
      requiredRoles,
      approvalComments,
      approvalRule.description // Pass rule description for email
    );
    setApprovalRule(null);
    setApprovalComments('');
  };

  // Bulk operations handlers
  const toggleRuleSelection = (ruleId: string) => {
    const newSelection = new Set(selectedRules);
    if (newSelection.has(ruleId)) {
      newSelection.delete(ruleId);
    } else {
      newSelection.add(ruleId);
    }
    setSelectedRules(newSelection);
  };

  const handleBulkApprovalRequest = async () => {
    const selectedRulesList = rules.filter(r => selectedRules.has(r.id));
    for (const rule of selectedRulesList) {
      const toState = rule.state === 'draft' ? 'staging' : 'prod';
      await createApprovalRequest(
        rule.id, rule.name, rule.version, rule.state, toState as RuleState,
        rule.author || 'Unknown', requiredRoles, bulkComments, rule.description
      );
    }
    setSelectedRules(new Set());
    setShowBulkApprovalDialog(false);
    setBulkComments('');
  };

  const handleBulkDelete = async () => {
    for (const ruleId of selectedRules) {
      await deleteRule(ruleId);
    }
    setSelectedRules(new Set());
    setShowBulkDeleteDialog(false);
  };

  const handleBulkArchive = async () => {
    const selectedRulesList = rules.filter(r => selectedRules.has(r.id));
    for (const rule of selectedRulesList) {
      await updateRule({ ...rule, state: 'archived' });
    }
    setSelectedRules(new Set());
    setShowBulkArchiveDialog(false);
  };

  const handleBulkStateChange = async () => {
    const selectedRulesList = rules.filter(r => selectedRules.has(r.id));
    for (const rule of selectedRulesList) {
      await updateRule({ ...rule, state: bulkTargetState });
    }
    setSelectedRules(new Set());
    setShowBulkStateChangeDialog(false);
  };

  const handleBulkExport = () => {
    const selectedRulesList = rules.filter(r => selectedRules.has(r.id));
    const dataStr = JSON.stringify(selectedRulesList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rules-export-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSelectedRules(new Set());
  };


  // Rule Editor handlers
  const handleCreateRule = () => {
    setEditorMode('create');
    setEditingRule(undefined);
    setEditorOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditorMode('edit');
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleSaveRule = (rule: Rule) => {
    if (editorMode === 'create') {
      addRule(rule);
    } else {
      updateRule(rule);
    }
    setEditorOpen(false);
    setEditingRule(undefined);
  };

  const handleDuplicateRule = (rule: Rule) => {
    const duplicated: Rule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      version: '1.0.0',
      state: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addRule(duplicated);
  };

  // Template handlers
  const handleSaveAsTemplate = () => {
    if (!saveAsTemplateRule) return;
    
    const { id, createdAt, updatedAt, version, ...ruleConfig } = saveAsTemplateRule;
    
    const template: RuleTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      usageCount: 0,
      author: saveAsTemplateRule.author || 'Unknown',
      tags: [saveAsTemplateRule.kind, templateCategory],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ruleConfig: ruleConfig as any,
    };
    addTemplate(template);
    setSaveAsTemplateRule(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('general');
  };

  const handleUseTemplate = (template: RuleTemplate) => {
    const newRule: Rule = {
      ...template.ruleConfig,
      id: `rule-${Date.now()}`,
      name: `${template.name} (from template)`,
      version: '1.0.0',
      state: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Rule;
    addRule(newRule);
    incrementUsage(template.id);
    setSelectedTab('rules');
    setSelectedState('draft');
  };


  // Import/Export handlers
  const handleImportRules = (importedRules: Rule[]) => {
    importedRules.forEach(rule => {
      const ruleWithMetadata: Rule = {
        ...rule,
        id: rule.id || `rule-${Date.now()}-${Math.random()}`,
        version: rule.version || '1.0.0',
        state: rule.state || 'draft',
        createdAt: rule.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addRule(ruleWithMetadata);
    });
    setShowImportModule(false);
    setSelectedTab('rules');
    setSelectedState('draft');
  };

  const getStateBadgeColor = (state: RuleState) => {
    switch (state) {
      case 'prod': return 'bg-green-500';
      case 'staging': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      case 'archived': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };





  if (loading) {
    return <div className="p-8 text-center">Loading rules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rules Engine</h1>
          <p className="text-muted-foreground">Manage dynamic business rules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModule(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={() => setShowExportModule(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateRule}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>


      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals {getPendingApprovals().length > 0 && (
              <Badge className="ml-2 bg-yellow-500">{getPendingApprovals().length}</Badge>
            )}
          </TabsTrigger>


          <TabsTrigger value="templates">
            <BookTemplate className="w-4 h-4 mr-2" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Conflicts
          </TabsTrigger>

        </TabsList>


        <TabsContent value="rules">
          <Tabs value={selectedState} onValueChange={(v) => setSelectedState(v as RuleState)}>
            <TabsList>
              <TabsTrigger value="prod">Production ({rules.filter(r => r.state === 'prod').length})</TabsTrigger>
              <TabsTrigger value="staging">Staging ({rules.filter(r => r.state === 'staging').length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({rules.filter(r => r.state === 'draft').length})</TabsTrigger>
              <TabsTrigger value="archived">Archived ({rules.filter(r => r.state === 'archived').length})</TabsTrigger>
            </TabsList>


            <TabsContent value={selectedState} className="space-y-4">
              {filteredRules.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No {selectedState} rules found
                  </CardContent>
                </Card>
              ) : (
                filteredRules.map(rule => {
                  const approvalStatus = getApprovalStatus(rule.id);
                  return (
                    <Card key={rule.id} className={selectedRules.has(rule.id) ? 'ring-2 ring-primary' : ''}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-3">
                          <Checkbox
                            checked={selectedRules.has(rule.id)}
                            onCheckedChange={() => toggleRuleSelection(rule.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              {rule.name}
                              <Badge className={getStateBadgeColor(rule.state)}>{rule.state}</Badge>
                              <Badge variant="outline">{rule.kind}</Badge>
                              {approvalStatus?.badge}
                            </CardTitle>
                            <CardDescription>
                              {rule.description || 'No description'}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSaveAsTemplateRule(rule);
                                setTemplateName(rule.name);
                                setTemplateDescription(rule.description || '');
                              }} 
                              title="Save as Template"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            {(rule.state === 'draft' || rule.state === 'staging') && (
                              <Button size="sm" variant="outline" onClick={() => setApprovalRule(rule)} title="Request Approval">
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setTestingRule(rule)} title="Simulate">
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setHistoryRule(rule)} title="Version History">
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditRule(rule)} title="Edit">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDuplicateRule(rule)} title="Duplicate">
                              <Copy className="w-4 h-4" />
                            </Button>

                            <Button size="sm" variant="destructive" onClick={() => deleteRule(rule.id)} title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                        </div>

                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Version: {rule.version}</p>
                          <p>ID: {rule.id}</p>
                          {rule.author && <p>Author: {rule.author}</p>}
                          <p>Updated: {new Date(rule.updatedAt).toLocaleString()}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateGallery
            templates={templates}
            onUseTemplate={handleUseTemplate}
            onDeleteTemplate={deleteTemplate}
          />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictsTab rules={rules} onUpdateRules={(updatedRules) => {
            updatedRules.forEach(rule => updateRule(rule));
          }} />
        </TabsContent>



      </Tabs>


      {testingRule && (
        <TestBench
          rule={testingRule}
          open={!!testingRule}
          onClose={() => setTestingRule(null)}
        />
      )}

      {historyRule && (
        <VersionHistory
          rule={historyRule}
          open={!!historyRule}
          onClose={() => setHistoryRule(null)}
          onRollback={(rolledBackRule) => {
            updateRule(rolledBackRule);
            setHistoryRule(null);
          }}
        />
      )}

      <Dialog open={!!approvalRule} onOpenChange={() => setApprovalRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Request approval to promote <strong>{approvalRule?.name}</strong> from{' '}
                <Badge>{approvalRule?.state}</Badge> to{' '}
                <Badge>{approvalRule?.state === 'draft' ? 'staging' : 'prod'}</Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Required Approver Roles</label>
              <Select
                value={requiredRoles[0]}
                onValueChange={(v) => setRequiredRoles([v as ApproverRole])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="senior_engineer">Senior Engineer</SelectItem>
                  <SelectItem value="qa_lead">QA Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Explain why this rule should be promoted..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalRule(null)}>
              Cancel
            </Button>
            <Button onClick={handleRequestApproval}>
              <Send className="w-4 h-4 mr-2" />
              Request Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkActionsToolbar
        selectedCount={selectedRules.size}
        onRequestApproval={() => setShowBulkApprovalDialog(true)}
        onBulkDelete={() => setShowBulkDeleteDialog(true)}
        onBulkArchive={() => setShowBulkArchiveDialog(true)}
        onBulkExport={handleBulkExport}
        onBulkStateChange={() => setShowBulkStateChangeDialog(true)}
        onClearSelection={() => setSelectedRules(new Set())}
        currentState={selectedState}
      />

      <Dialog open={showBulkApprovalDialog} onOpenChange={setShowBulkApprovalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Approval Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Request approval for {selectedRules.size} selected rules</p>
            <Select value={requiredRoles[0]} onValueChange={(v) => setRequiredRoles([v as ApproverRole])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="senior_engineer">Senior Engineer</SelectItem>
                <SelectItem value="qa_lead">QA Lead</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={bulkComments} onChange={(e) => setBulkComments(e.target.value)} placeholder="Comments..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkApprovalDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkApprovalRequest}>Request Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {selectedRules.size} Rules?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkArchiveDialog} onOpenChange={setShowBulkArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive {selectedRules.size} Rules?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showBulkStateChangeDialog} onOpenChange={setShowBulkStateChangeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change State for {selectedRules.size} Rules</DialogTitle></DialogHeader>
          <Select value={bulkTargetState} onValueChange={(v) => setBulkTargetState(v as RuleState)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="prod">Production</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStateChangeDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkStateChange}>Change State</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saveAsTemplateRule} onOpenChange={() => setSaveAsTemplateRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Rule as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this rule configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template does..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select
                value={templateCategory}
                onValueChange={(v) => setTemplateCategory(v as TemplateCategory)}
              >
                <SelectTrigger id="template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing">Pricing</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsTemplateRule(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveRule}
        rule={editingRule}
        mode={editorMode}
        existingRules={rules}
      />


      {showImportModule && (
        <RuleImportModule
          onImport={handleImportRules}
          onClose={() => setShowImportModule(false)}
        />
      )}

      {showExportModule && (
        <RuleExportModule
          rules={rules}
          selectedRuleIds={Array.from(selectedRules)}
          onClose={() => setShowExportModule(false)}
        />
      )}

    </div>
  );
}


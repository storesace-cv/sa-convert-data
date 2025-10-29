import { useState, useEffect, useMemo } from 'react';
import { Rule, RuleConflict, ConflictSeverity, ConflictType } from '@/types/rule';
import { detectConflicts } from '@/utils/conflictDetector';
import { ConflictAnalyzer } from './ConflictAnalyzer';
import { ConflictResolutionWizard } from './ConflictResolutionWizard';
import { ConflictResolutionHistory } from './ConflictResolutionHistory';
import { useConflictResolutionHistory } from '@/hooks/useConflictResolutionHistory';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCw, AlertTriangle, XCircle, Filter, History } from 'lucide-react';



interface ConflictsTabProps {
  rules: Rule[];
  onUpdateRules?: (rules: Rule[]) => void;
}

export function ConflictsTab({ rules, onUpdateRules }: ConflictsTabProps) {
  const { user, profile } = useAuth();
  const [conflicts, setConflicts] = useState<RuleConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<ConflictSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ConflictType | 'all'>('all');
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<RuleConflict | null>(null);
  const [activeTab, setActiveTab] = useState<'conflicts' | 'history'>('conflicts');
  const { addEntry } = useConflictResolutionHistory();



  const scanForConflicts = () => {
    setLoading(true);
    setTimeout(() => {
      const detected = detectConflicts(rules);
      setConflicts(detected);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    scanForConflicts();
  }, [rules]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      if (resolvedConflicts.has(c.id)) return false;
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      return true;
    });
  }, [conflicts, severityFilter, typeFilter, resolvedConflicts]);

  const errorCount = filteredConflicts.filter(c => c.severity === 'error').length;
  const warningCount = filteredConflicts.filter(c => c.severity === 'warning').length;

  const handleResolve = (conflictId: string) => {
    setResolvedConflicts(new Set([...resolvedConflicts, conflictId]));
  };

  const handleOpenWizard = (conflict: RuleConflict) => {
    setSelectedConflict(conflict);
    setWizardOpen(true);
  };

  const handleApplyResolution = (
    modifiedRules: Rule[], 
    rulesToDelete?: string[], 
    resolutionData?: {
      strategy: string;
      conflictDescription: string;
      resolutionDescription: string;
    }
  ) => {
    if (!onUpdateRules) return;

    // Store original rules for history
    const originalRules = rules.filter(r => 
      r.id === selectedConflict?.ruleId || r.id === selectedConflict?.conflictingRuleId
    );

    let updatedRules = [...rules];

    // Delete rules if needed (for merge strategy)
    if (rulesToDelete && rulesToDelete.length > 0) {
      updatedRules = updatedRules.filter(r => !rulesToDelete.includes(r.id));
    }

    // Update or add modified rules
    modifiedRules.forEach(modifiedRule => {
      const existingIndex = updatedRules.findIndex(r => r.id === modifiedRule.id);
      if (existingIndex >= 0) {
        updatedRules[existingIndex] = modifiedRule;
      } else {
        updatedRules.push(modifiedRule);
      }
    });

    onUpdateRules(updatedRules);


    // Record in history if resolution data provided
    if (resolutionData && selectedConflict) {
      const userId = user?.id || 'anonymous';
      const userName = profile?.full_name || user?.email || 'Anonymous User';
      
      addEntry({
        userId,
        userName,
        conflictType: selectedConflict.type,
        resolutionStrategy: resolutionData.strategy as any,
        affectedRuleIds: [selectedConflict.ruleId, selectedConflict.conflictingRuleId],
        beforeState: {
          rules: originalRules,
          conflictDescription: resolutionData.conflictDescription
        },
        afterState: {
          rules: modifiedRules,
          resolutionDescription: resolutionData.resolutionDescription
        },
        canUndo: true
      });
    }

    // Mark conflict as resolved
    if (selectedConflict) {
      setResolvedConflicts(new Set([...resolvedConflicts, selectedConflict.id]));
    }

    // Rescan for conflicts
    setTimeout(() => scanForConflicts(), 100);
  };


  const handleUndoResolution = (restoredRules: Rule[]) => {
    if (!onUpdateRules) return;
    onUpdateRules(restoredRules);
    setTimeout(() => scanForConflicts(), 100);
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Conflict Detection & Resolution</h2>
          <p className="text-muted-foreground">Analyze rules for potential conflicts and track resolution history</p>
        </div>
        <Button onClick={scanForConflicts} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Scan for Conflicts'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conflicts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Active Conflicts ({filteredConflicts.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Resolution History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conflicts" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Conflicts</CardDescription>
                <CardTitle className="text-3xl">{filteredConflicts.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Errors
                </CardDescription>
                <CardTitle className="text-3xl text-red-500">{errorCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Warnings
                </CardDescription>
                <CardTitle className="text-3xl text-yellow-500">{warningCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Severity</label>
                  <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="error">Errors Only</SelectItem>
                      <SelectItem value="warning">Warnings Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="overlapping_conditions">Overlapping Conditions</SelectItem>
                      <SelectItem value="contradictory_actions">Contradictory Actions</SelectItem>
                      <SelectItem value="duplicate_logic">Duplicate Logic</SelectItem>
                      <SelectItem value="schedule_overlap">Schedule Overlap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <ConflictAnalyzer
            conflicts={filteredConflicts}
            rules={rules}
            onResolve={handleResolve}
            onOpenWizard={handleOpenWizard}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ConflictResolutionHistory onUndoResolution={handleUndoResolution} />
        </TabsContent>
      </Tabs>

      {selectedConflict && (
        <ConflictResolutionWizard
          conflict={selectedConflict}
          allRules={rules}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onResolve={handleApplyResolution}
        />
      )}
    </div>
  );
}



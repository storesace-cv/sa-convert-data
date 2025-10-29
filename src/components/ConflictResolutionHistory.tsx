import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Undo2, Calendar, User, GitMerge, Download, BarChart3 } from 'lucide-react';
import { useConflictResolutionHistory } from '@/hooks/useConflictResolutionHistory';
import { ConflictHistoryFilters } from '@/types/conflictHistory';
import { Rule } from '@/types/rule';
import { ConflictHistoryExportDialog } from './ConflictHistoryExportDialog';
import { calculateStatistics } from '@/utils/conflictHistoryExport';


interface ConflictResolutionHistoryProps {
  onUndoResolution: (rules: Rule[]) => void;
}

export const ConflictResolutionHistory: React.FC<ConflictResolutionHistoryProps> = ({ onUndoResolution }) => {
  const { history, undoResolution, filterHistory } = useConflictResolutionHistory();
  const [filters, setFilters] = useState<ConflictHistoryFilters>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const filteredHistory = filterHistory(filters);
  const statistics = calculateStatistics(filteredHistory);


  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleUndo = (entryId: string) => {
    const rules = undoResolution(entryId);
    if (rules) {
      onUndoResolution(rules);
    }
  };

  const strategyLabels = {
    merge: 'Merge Rules',
    adjust_conditions: 'Adjust Conditions',
    modify_schedule: 'Modify Schedule',
    change_priority: 'Change Priority',
    manual: 'Manual Resolution',
  };

  return (
    <div className="space-y-4">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resolution Statistics</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {showStats ? 'Hide' : 'Show'} Stats
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{statistics.totalResolutions}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Resolutions</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {Object.keys(statistics.conflictTypeBreakdown).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Conflict Types</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {Object.keys(statistics.strategyBreakdown).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Strategies Used</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {Object.keys(statistics.resolutionsByUser).length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Active Users</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2">Top Conflict Types</h4>
                <div className="space-y-1">
                  {Object.entries(statistics.conflictTypeBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span>{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Most Used Strategies</h4>
                <div className="space-y-1">
                  {Object.entries(statistics.strategyBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([strategy, count]) => (
                      <div key={strategy} className="flex justify-between text-sm">
                        <span>{strategyLabels[strategy] || strategy}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Top Contributors</h4>
                <div className="space-y-1">
                  {Object.entries(statistics.resolutionsByUser)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([user, count]) => (
                      <div key={user} className="flex justify-between text-sm">
                        <span>{user}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Resolution Type</label>
              <Select value={filters.resolutionType || 'all'} onValueChange={(v) => setFilters({ ...filters, resolutionType: v === 'all' ? undefined : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="merge">Merge Rules</SelectItem>
                  <SelectItem value="adjust_conditions">Adjust Conditions</SelectItem>
                  <SelectItem value="modify_schedule">Modify Schedule</SelectItem>
                  <SelectItem value="change_priority">Change Priority</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search conflicts..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => setFilters({})}>Clear Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No conflict resolutions found
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((entry) => (
            <Card key={entry.id}>
              <Collapsible open={expandedIds.has(entry.id)} onOpenChange={() => toggleExpanded(entry.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{strategyLabels[entry.resolutionStrategy]}</Badge>
                        <Badge variant="secondary">{entry.conflictType}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {entry.timestamp.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {entry.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitMerge className="w-4 h-4" />
                          {entry.affectedRuleIds.length} rules affected
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.canUndo && (
                        <Button size="sm" variant="outline" onClick={() => handleUndo(entry.id)}>
                          <Undo2 className="w-4 h-4 mr-1" />
                          Undo
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="ghost">
                          {expandedIds.has(entry.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Conflict Description</h4>
                      <p className="text-sm text-muted-foreground">{entry.beforeState.conflictDescription}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Before ({entry.beforeState.rules.length} rules)</h4>
                        <div className="space-y-2">
                          {entry.beforeState.rules.map((rule) => (
                            <div key={rule.id} className="text-sm p-2 bg-muted rounded">
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-xs text-muted-foreground">Priority: {rule.priority}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">After ({entry.afterState.rules.length} rules)</h4>
                        <div className="space-y-2">
                          {entry.afterState.rules.map((rule) => (
                            <div key={rule.id} className="text-sm p-2 bg-green-50 dark:bg-green-950 rounded">
                              <div className="font-medium">{rule.name}</div>
                              <div className="text-xs text-muted-foreground">Priority: {rule.priority}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Resolution Applied</h4>
                      <p className="text-sm text-muted-foreground">{entry.afterState.resolutionDescription}</p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      <ConflictHistoryExportDialog 
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        entries={filteredHistory}
      />
    </div>

  );
};

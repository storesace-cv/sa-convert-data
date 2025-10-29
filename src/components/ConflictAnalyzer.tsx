import { RuleConflict, Rule } from '@/types/rule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Lightbulb, Wand2 } from 'lucide-react';

import { useState } from 'react';

interface ConflictAnalyzerProps {
  conflicts: RuleConflict[];
  rules: Rule[];
  onResolve?: (conflictId: string) => void;
  onOpenWizard?: (conflict: RuleConflict) => void;
}

export function ConflictAnalyzer({ conflicts, rules, onResolve, onOpenWizard }: ConflictAnalyzerProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());


  const toggleExpand = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const getRuleName = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    return rule?.name || ruleId;
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'error' ? (
      <XCircle className="w-5 h-5 text-red-500" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-yellow-500" />
    );
  };

  const getSeverityBadge = (severity: string) => {
    return severity === 'error' ? (
      <Badge className="bg-red-100 text-red-800">Error</Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
    );
  };

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-green-500 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">No Conflicts Detected</h3>
          <p className="text-muted-foreground">All rules are compatible with each other</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {conflicts.map(conflict => {
        const isExpanded = expandedConflicts.has(conflict.id);
        
        return (
          <Card key={conflict.id} className="border-l-4" style={{
            borderLeftColor: conflict.severity === 'error' ? '#ef4444' : '#eab308'
          }}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(conflict.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{conflict.description}</CardTitle>
                      {getSeverityBadge(conflict.severity)}
                      <Badge variant="outline">{conflict.type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <CardDescription>{conflict.details}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(conflict.id)}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            
            {isExpanded && (
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Conflicting Rules:</h4>
                  <div className="space-y-1">
                    {conflict.conflictingRules.map(ruleId => (
                      <div key={ruleId} className="flex items-center gap-2 text-sm">
                        <Badge variant="secondary">{getRuleName(ruleId)}</Badge>
                        <span className="text-muted-foreground">({ruleId})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Suggestions:
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-sm text-muted-foreground">
                    {conflict.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  {onOpenWizard && (
                    <Button 
                      size="sm" 
                      onClick={() => onOpenWizard(conflict)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Resolve with Wizard
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onResolve?.(conflict.id)}>
                    Mark as Resolved
                  </Button>
                </div>

              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

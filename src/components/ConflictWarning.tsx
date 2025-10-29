import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RuleConflict } from '@/types/rule';
import { Button } from './ui/button';
import { useState } from 'react';

interface ConflictWarningProps {
  conflicts: RuleConflict[];
  compact?: boolean;
}

export const ConflictWarning: React.FC<ConflictWarningProps> = ({ conflicts, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (conflicts.length === 0) return null;

  const errorConflicts = conflicts.filter(c => c.severity === 'error');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');

  if (compact) {
    return (
      <Alert variant={errorConflicts.length > 0 ? 'destructive' : 'default'} className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {errorConflicts.length > 0 ? 'Critical Conflicts Detected' : 'Potential Conflicts Detected'}
          <Badge variant={errorConflicts.length > 0 ? 'destructive' : 'secondary'}>
            {conflicts.length}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          {errorConflicts.length > 0 && (
            <p className="font-medium">{errorConflicts.length} error(s) must be resolved before saving.</p>
          )}
          {warningConflicts.length > 0 && (
            <p>{warningConflicts.length} warning(s) detected.</p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4 mb-4 border-2 border-orange-200 bg-orange-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {errorConflicts.length > 0 ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          )}
          <h3 className="font-semibold text-lg">
            {errorConflicts.length > 0 ? 'Critical Conflicts' : 'Potential Conflicts'}
          </h3>
          <Badge variant={errorConflicts.length > 0 ? 'destructive' : 'secondary'}>
            {conflicts.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white p-3 rounded-lg border">
              <div className="flex items-start gap-2 mb-2">
                <Badge variant={conflict.severity === 'error' ? 'destructive' : 'secondary'}>
                  {conflict.severity}
                </Badge>
                <Badge variant="outline">{conflict.type.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="font-medium text-sm mb-1">{conflict.description}</p>
              <p className="text-xs text-muted-foreground mb-2">{conflict.details}</p>
              {conflict.suggestions.length > 0 && (
                <div className="text-xs">
                  <p className="font-medium mb-1">Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {conflict.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

import React from 'react';
import { RuleExecutionResult } from '@/utils/ruleExecutionEngine';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface RuleExecutionStatusProps {
  results: RuleExecutionResult[];
  className?: string;
}

export const RuleExecutionStatus: React.FC<RuleExecutionStatusProps> = ({ results, className = '' }) => {
  if (results.length === 0) return null;
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Regras Executadas
      </h4>
      
      <div className="space-y-2">
        {results.map((result, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-medium">{result.ruleName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? 'Sucesso' : 'Erro'}
              </Badge>
              <span className="text-xs text-gray-500">
                {result.executionTime.toFixed(2)}ms
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {results.some(r => !r.success) && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Erros:</strong>
          {results.filter(r => !r.success).map((r, idx) => (
            <div key={idx}>• {r.ruleName}: {r.error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

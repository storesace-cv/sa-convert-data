import React from 'react';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const RulesStatusWidget: React.FC = () => {
  const { rules, loading } = useRuleRegistry();
  
  const prodRules = rules.filter(r => r.state === 'prod');
  const draftRules = rules.filter(r => r.state === 'draft');
  
  const ruleCategories = {
    classification: prodRules.filter(r => r.id.includes('class') || r.id.includes('tipo')),
    deduplication: prodRules.filter(r => r.id.includes('dedupe') || r.id.includes('merge')),
    validation: prodRules.filter(r => r.id.includes('iva') || r.id.includes('export'))
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 animate-spin" />
          <h3 className="font-semibold">Carregando Regras...</h3>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold">Regras Ativas</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Classificação</p>
          <div className="space-y-1">
            {ruleCategories.classification.map(rule => (
              <div key={rule.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{rule.name}</span>
                <Badge variant="outline" className="ml-2">{rule.version}</Badge>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-2">Deduplicação</p>
          <div className="space-y-1">
            {ruleCategories.deduplication.map(rule => (
              <div key={rule.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{rule.name}</span>
                <Badge variant="outline" className="ml-2">{rule.version}</Badge>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-2">Validação</p>
          <div className="space-y-1">
            {ruleCategories.validation.map(rule => (
              <div key={rule.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{rule.name}</span>
                <Badge variant="outline" className="ml-2">{rule.version}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total em Produção:</span>
          <span className="font-semibold">{prodRules.length}</span>
        </div>
        {draftRules.length > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Rascunhos:</span>
            <span className="font-semibold text-amber-600">{draftRules.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

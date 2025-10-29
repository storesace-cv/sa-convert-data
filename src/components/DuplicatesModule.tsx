import React, { useState, useEffect } from 'react';
import { ItemCanonico, Duplicacao } from '@/types/item';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { executeRule, RuleExecutionResult } from '@/utils/ruleExecutionEngine';
import { RuleExecutionStatus } from './RuleExecutionStatus';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface DuplicatesModuleProps {
  items: ItemCanonico[];
  onMerge: (originalId: string, duplicateIds: string[]) => void;
}

export const DuplicatesModule: React.FC<DuplicatesModuleProps> = ({ items, onMerge }) => {
  const { rules, loading } = useRuleRegistry();
  const [duplicates, setDuplicates] = useState<Duplicacao[]>([]);
  const [executionResults, setExecutionResults] = useState<RuleExecutionResult[]>([]);
  
  useEffect(() => {
    if (loading || items.length === 0) return;
    
    const dedupeRule = rules.find(r => r.id === 'dedupe_score' && r.state === 'prod');
    const mergeRule = rules.find(r => r.id === 'merge_policy' && r.state === 'prod');
    
    if (!dedupeRule) {
      console.warn('dedupe_score rule not found, using fallback');
      return;
    }
    
    const found: Duplicacao[] = [];
    const results: RuleExecutionResult[] = [];
    
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const result = executeRule(dedupeRule, {
          item1: items[i],
          item2: items[j]
        });
        
        results.push(result);
        
        if (result.success && result.output?.score >= 85) {
          found.push({
            id_original: items[i].id,
            id_duplicado: items[j].id,
            score: result.output.score,
            motivo: ['similar_nome'],
            estado: 'pendente'
          });
        }
      }
    }
    
    setDuplicates(found);
    setExecutionResults(results.slice(0, 10)); // Show first 10 for UI
  }, [items, rules, loading]);
  
  const handleMerge = (dup: Duplicacao) => {
    const mergeRule = rules.find(r => r.id === 'merge_policy' && r.state === 'prod');
    
    if (mergeRule) {
      const original = items.find(i => i.id === dup.id_original);
      const duplicate = items.find(i => i.id === dup.id_duplicado);
      
      const result = executeRule(mergeRule, {
        original,
        duplicate
      });
      
      console.log('Merge policy result:', result);
    }
    
    onMerge(dup.id_original, [dup.id_duplicado]);
  };
  
  if (loading) return <div className="p-8">Carregando regras...</div>;
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Duplicados Detectados</h2>
      
      <RuleExecutionStatus results={executionResults} className="mb-6" />
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-600">Total de pares duplicados encontrados (≥85% similaridade):</p>
        <p className="text-4xl font-bold text-amber-600 mt-2">{duplicates.length}</p>
      </div>
      
      <div className="space-y-4">
        {duplicates.map((dup, idx) => {
          const original = items.find(i => i.id === dup.id_original);
          const duplicate = items.find(i => i.id === dup.id_duplicado);
          
          return (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Score: {dup.score}%</Badge>
                  <Badge>dedupe_score@1.0.0</Badge>
                </div>
                <Button onClick={() => handleMerge(dup)}>
                  Fundir
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border-r pr-4">
                  <p className="text-xs text-gray-500 mb-1">ORIGINAL</p>
                  <p className="font-semibold">{original?.descricao}</p>
                  <p className="text-sm text-gray-600">Código: {original?.codigo_antigo}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs text-gray-500 mb-1">DUPLICADO</p>
                  <p className="font-semibold">{duplicate?.descricao}</p>
                  <p className="text-sm text-gray-600">Código: {duplicate?.codigo_antigo}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

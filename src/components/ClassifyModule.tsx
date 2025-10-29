import React, { useState } from 'react';
import { ptPT } from '@/i18n/pt-PT';
import { ItemCanonico } from '@/types/item';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { executeRule, RuleExecutionResult } from '@/utils/ruleExecutionEngine';
import { RuleExecutionStatus } from './RuleExecutionStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface ClassifyModuleProps {
  items: ItemCanonico[];
  onClassify: (updatedItems: ItemCanonico[]) => void;
}

interface ClassificationPreview {
  item: ItemCanonico;
  changes: {
    tipo?: { old: string; new: string };
    class_tag?: { old: string; new: string };
  };
  ruleResults: RuleExecutionResult[];
}

export const ClassifyModule: React.FC<ClassifyModuleProps> = ({ items, onClassify }) => {
  const { rules, loading } = useRuleRegistry();
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [preview, setPreview] = useState<ClassificationPreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [executionResults, setExecutionResults] = useState<RuleExecutionResult[]>([]);
  
  const availableRules = rules.filter(r => 
    r.state === 'prod' && 
    (r.id === 'classification_tipo' || r.id === 'class_tag_315')
  );
  
  const handlePreview = () => {
    const rule = rules.find(r => r.id === selectedRule);
    if (!rule) return;
    
    const previews: ClassificationPreview[] = [];
    const allResults: RuleExecutionResult[] = [];
    
    items.forEach(item => {
      const result = executeRule(rule, {
        familia: item.familia,
        subfamilia: item.subfamilia,
        canonical_class_tag: item.class_tag
      });
      
      allResults.push(result);
      
      if (result.success && result.output) {
        const changes: any = {};
        
        if (rule.id === 'class_tag_315' && result.output.set?.class_tag) {
          const newTag = result.output.set.class_tag;
          if (item.class_tag !== newTag) {
            changes.class_tag = { old: item.class_tag, new: newTag };
          }
        }
        
        if (Object.keys(changes).length > 0) {
          previews.push({ item, changes, ruleResults: [result] });
        }
      }
    });
    
    setPreview(previews);
    setExecutionResults(allResults);
    setShowPreview(true);
  };
  
  const handleApply = () => {
    const rule = rules.find(r => r.id === selectedRule);
    if (!rule) return;
    
    const updatedItems = items.map(item => {
      const result = executeRule(rule, {
        familia: item.familia,
        subfamilia: item.subfamilia,
        canonical_class_tag: item.class_tag
      });
      
      if (result.success && result.output?.set) {
        return { 
          ...item, 
          ...result.output.set,
          updated_at: new Date().toISOString() 
        };
      }
      return item;
    });
    
    onClassify(updatedItems);
    setShowPreview(false);
    setPreview([]);
  };
  
  const unclassified = items.filter(i => !i.familia && !i.subfamilia).length;
  
  if (loading) return <div className="p-8">Carregando regras...</div>;
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">{ptPT.classify.title}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total de Artigos</p>
          <p className="text-3xl font-bold mt-2">{items.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">COM Família/Subfamília</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{items.length - unclassified}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">SEM Família/Subfamília</p>
          <p className="text-3xl font-bold mt-2 text-amber-600">{unclassified}</p>
        </div>
      </div>
      
      {!showPreview ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Regras de Classificação (Registry)</h3>
          
          <div className="space-y-4 mb-6">
            {availableRules.map(rule => (
              <label key={rule.id} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="rule" value={rule.id} checked={selectedRule === rule.id}
                  onChange={e => setSelectedRule(e.target.value)} className="mt-1 mr-3" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{rule.name}</p>
                    <Badge variant="outline">{rule.version}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                </div>
              </label>
            ))}
          </div>
          
          <Button onClick={handlePreview} disabled={!selectedRule}>
            Pré-visualizar Alterações
          </Button>
        </div>
      ) : (
        <>
          <RuleExecutionStatus results={executionResults} className="mb-6" />
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Pré-visualização ({preview.length} alterações)</h3>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Cancelar</Button>
                <Button onClick={handleApply}>Aplicar Alterações</Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium truncate flex-1">{p.item.descricao}</span>
                  <div className="flex items-center gap-2">
                    {p.changes.class_tag && (
                      <>
                        <Badge variant="outline">{p.changes.class_tag.old}</Badge>
                        <ArrowRight className="w-4 h-4" />
                        <Badge>{p.changes.class_tag.new}</Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

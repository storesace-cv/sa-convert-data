import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { DecisionTreeNode } from '../types/rule';

interface DecisionTreeEditorProps {
  nodes: DecisionTreeNode[];
  onChange: (nodes: DecisionTreeNode[]) => void;
  inputSchema: string;
  outputSchema: string;
  onInputSchemaChange: (schema: string) => void;
  onOutputSchemaChange: (schema: string) => void;
}

export const DecisionTreeEditor: React.FC<DecisionTreeEditorProps> = ({
  nodes,
  onChange,
  inputSchema,
  outputSchema,
  onInputSchemaChange,
  onOutputSchemaChange,
}) => {
  const addNode = () => {
    const newNode: DecisionTreeNode = {
      id: `node_${Date.now()}`,
      if: '',
      then: { decision: {} },
      else: { decision: {} },
    };
    onChange([...nodes, newNode]);
  };

  const updateNode = (index: number, field: string, value: any) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeNode = (index: number) => {
    onChange(nodes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Input Schema</label>
          <Input value={inputSchema} onChange={(e) => onInputSchemaChange(e.target.value)} placeholder="e.g., order" />
        </div>
        <div>
          <label className="text-sm font-medium">Output Schema</label>
          <Input value={outputSchema} onChange={(e) => onOutputSchemaChange(e.target.value)} placeholder="e.g., pricing_decision" />
        </div>
      </div>

      <div className="space-y-3">
        {nodes.map((node, idx) => (
          <Card key={node.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium">Node {idx + 1}</h4>
              <Button variant="ghost" size="sm" onClick={() => removeNode(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Condition (e.g., input.price > 100)"
                value={node.if || ''}
                onChange={(e) => updateNode(idx, 'if', e.target.value)}
                rows={2}
              />
              <Input
                placeholder="Then Decision (JSON)"
                value={JSON.stringify(node.then)}
                onChange={(e) => {
                  try {
                    updateNode(idx, 'then', JSON.parse(e.target.value));
                  } catch {}
                }}
              />
              <Input
                placeholder="Else Decision (JSON)"
                value={JSON.stringify(node.else)}
                onChange={(e) => {
                  try {
                    updateNode(idx, 'else', JSON.parse(e.target.value));
                  } catch {}
                }}
              />
            </div>
          </Card>
        ))}
      </div>

      <Button onClick={addNode} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Node
      </Button>
    </div>
  );
};

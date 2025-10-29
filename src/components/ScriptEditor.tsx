import React from 'react';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Code } from 'lucide-react';

interface ScriptEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ code, onChange }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <Code className="h-4 w-4" />
        <AlertDescription>
          Write your rule logic using safe-dsl. Access input via <code className="bg-muted px-1 rounded">input</code> variable.
          Return decision object.
        </AlertDescription>
      </Alert>

      <Card className="p-4">
        <label className="text-sm font-medium mb-2 block">Rule Script</label>
        <Textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`// Example:\nif (input.price > 100) {\n  return { discount: 0.1, reason: "bulk_discount" };\n}\nreturn { discount: 0, reason: "no_discount" };`}
          className="font-mono text-sm min-h-[300px]"
        />
      </Card>

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Available operations:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Conditionals: if/else, switch</li>
          <li>Comparisons: {'>'}, {'<'}, {'=='}, {'!='}, {'>=', '<='}</li>
          <li>Logical: &&, ||, !</li>
          <li>Math: +, -, *, /, %</li>
          <li>String operations: concat, includes, startsWith, endsWith</li>
        </ul>
      </div>
    </div>
  );
};

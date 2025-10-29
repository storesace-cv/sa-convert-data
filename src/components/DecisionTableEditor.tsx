import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface DecisionTableEditorProps {
  columns: string[];
  rows: any[][];
  resolution: 'first_match' | 'all_matches';
  onColumnsChange: (columns: string[]) => void;
  onRowsChange: (rows: any[][]) => void;
  onResolutionChange: (resolution: 'first_match' | 'all_matches') => void;
}

export const DecisionTableEditor: React.FC<DecisionTableEditorProps> = ({
  columns,
  rows,
  resolution,
  onColumnsChange,
  onRowsChange,
  onResolutionChange,
}) => {
  const addColumn = () => {
    onColumnsChange([...columns, `Column ${columns.length + 1}`]);
    onRowsChange(rows.map(row => [...row, '']));
  };

  const updateColumn = (index: number, value: string) => {
    const updated = [...columns];
    updated[index] = value;
    onColumnsChange(updated);
  };

  const removeColumn = (index: number) => {
    onColumnsChange(columns.filter((_, i) => i !== index));
    onRowsChange(rows.map(row => row.filter((_, i) => i !== index)));
  };

  const addRow = () => {
    onRowsChange([...rows, new Array(columns.length).fill('')]);
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const updated = [...rows];
    updated[rowIdx] = [...updated[rowIdx]];
    updated[rowIdx][colIdx] = value;
    onRowsChange(updated);
  };

  const removeRow = (index: number) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Resolution Strategy</label>
        <Select value={resolution} onValueChange={(v: any) => onResolutionChange(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_match">First Match</SelectItem>
            <SelectItem value="all_matches">All Matches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4">
        <div className="flex gap-2 mb-3">
          {columns.map((col, idx) => (
            <div key={idx} className="flex-1 flex gap-1">
              <Input value={col} onChange={(e) => updateColumn(idx, e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => removeColumn(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button onClick={addColumn} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-2">
              {row.map((cell, colIdx) => (
                <Input
                  key={colIdx}
                  className="flex-1"
                  value={cell}
                  onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                />
              ))}
              <Button variant="ghost" size="sm" onClick={() => removeRow(rowIdx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={addRow} variant="outline" className="w-full mt-3">
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </Card>
    </div>
  );
};

import React, { useState } from 'react';
import { Rule } from '@/types/rule';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Download, FileJson, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RuleExportModuleProps {
  rules: Rule[];
  selectedRuleIds?: string[];
  onClose: () => void;
}

export const RuleExportModule: React.FC<RuleExportModuleProps> = ({ 
  rules, 
  selectedRuleIds = [], 
  onClose 
}) => {
  const [format, setFormat] = useState<'json' | 'csv' | 'xlsx'>('json');
  const [includeTests, setIncludeTests] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedRuleIds);

  const rulesToExport = selectedIds.length > 0 
    ? rules.filter(r => selectedIds.includes(r.id))
    : rules;

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedIds(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => 
      prev.length === rules.length ? [] : rules.map(r => r.id)
    );
  };

  const exportToJSON = () => {
    const data = rulesToExport.map(rule => {
      const exported = { ...rule };
      if (!includeTests) {
        delete exported.tests;
      }
      return exported;
    });

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `rules_export_${Date.now()}.json`, 'application/json');
  };

  const exportToCSV = () => {
    const data = rulesToExport.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      kind: rule.kind,
      state: rule.state,
      version: rule.version,
      author: rule.author || '',
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      tags: rule.tags?.join(', ') || '',
      // Serialize complex fields as JSON strings
      nodes: rule.kind === 'decision_tree' ? JSON.stringify(rule.nodes) : '',
      columns: rule.kind === 'decision_table' ? JSON.stringify(rule.columns) : '',
      rows: rule.kind === 'decision_table' ? JSON.stringify(rule.rows) : '',
      resolution: rule.kind === 'decision_table' ? rule.resolution : '',
      code: rule.kind === 'script' ? rule.code : '',
      language: rule.kind === 'script' ? rule.language : '',
      tests: includeTests ? JSON.stringify(rule.tests || []) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csv, `rules_export_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportToExcel = () => {
    const data = rulesToExport.map(rule => ({
      ID: rule.id,
      Name: rule.name,
      Description: rule.description || '',
      Kind: rule.kind,
      State: rule.state,
      Version: rule.version,
      Author: rule.author || '',
      'Created At': rule.createdAt,
      'Updated At': rule.updatedAt,
      Tags: rule.tags?.join(', ') || '',
      Configuration: JSON.stringify(rule),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rules');
    XLSX.writeFile(wb, `rules_export_${Date.now()}.xlsx`);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (format === 'json') exportToJSON();
    else if (format === 'csv') exportToCSV();
    else if (format === 'xlsx') exportToExcel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Export Rules</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Rules to Export</Label>
            <div className="flex items-center gap-2 mb-3">
              <Checkbox 
                checked={selectedIds.length === rules.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm">Select All ({rules.length} rules)</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedIds.includes(rule.id)}
                    onCheckedChange={() => toggleRuleSelection(rule.id)}
                  />
                  <span className="text-sm">{rule.name} ({rule.kind})</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Selected: {selectedIds.length} rule(s)
            </p>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Export Format</Label>
            <RadioGroup value={format} onValueChange={(v: any) => setFormat(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON - Best for re-importing rules
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV - Compatible with spreadsheet software
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel - Full formatting support
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              checked={includeTests}
              onCheckedChange={(checked) => setIncludeTests(checked as boolean)}
            />
            <Label className="cursor-pointer">Include test cases in export</Label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedIds.length === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export {selectedIds.length} Rule(s)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

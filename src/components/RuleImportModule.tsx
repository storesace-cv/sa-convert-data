import React, { useState, useCallback } from 'react';
import { Rule, RuleValidationResult } from '@/types/rule';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface RuleImportModuleProps {
  onImport: (rules: Rule[]) => void;
  onClose: () => void;
}

export const RuleImportModule: React.FC<RuleImportModuleProps> = ({ onImport, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRules, setParsedRules] = useState<Rule[]>([]);
  const [validationResults, setValidationResults] = useState<RuleValidationResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [error, setError] = useState<string>('');

  const validateRule = (rule: any): RuleValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rule.name) errors.push('Rule name is required');
    if (!rule.kind) errors.push('Rule kind is required');
    if (!['decision_tree', 'decision_table', 'script'].includes(rule.kind)) {
      errors.push('Invalid rule kind');
    }
    if (!rule.state) warnings.push('No state specified, will default to draft');
    if (!rule.version) warnings.push('No version specified, will default to 1.0.0');

    return { valid: errors.length === 0, errors, warnings };
  };

  const parseJSONFile = async (file: File): Promise<Rule[]> => {
    const text = await file.text();
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  };

  const parseCSVFile = async (file: File): Promise<Rule[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    return jsonData.map((row: any) => ({
      ...row,
      tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
      nodes: row.nodes ? JSON.parse(row.nodes) : undefined,
      columns: row.columns ? JSON.parse(row.columns) : undefined,
      rows: row.rows ? JSON.parse(row.rows) : undefined,
    }));
  };

  const handleFile = async (file: File) => {
    setFile(file);
    setError('');
    
    try {
      let rules: Rule[];
      if (file.name.endsWith('.json')) {
        rules = await parseJSONFile(file);
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        rules = await parseCSVFile(file);
      } else {
        throw new Error('Unsupported file format');
      }

      const results = rules.map(validateRule);
      setParsedRules(rules);
      setValidationResults(results);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    const validRules = parsedRules.filter((_, idx) => validationResults[idx].valid);
    onImport(validRules);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Import Rules</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {step === 'upload' && (
          <div>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">Drag and drop your file here</p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label>
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
                <input
                  type="file"
                  accept=".json,.csv,.xlsx"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-4">Supports JSON, CSV, and Excel files</p>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div>
            <Alert className="mb-4">
              <AlertDescription>
                Found {parsedRules.length} rule(s). {validationResults.filter(r => r.valid).length} valid, {validationResults.filter(r => !r.valid).length} invalid.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {parsedRules.map((rule, idx) => (
                <Card key={idx} className={`p-4 ${validationResults[idx].valid ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {validationResults[idx].valid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <p className="text-sm text-gray-600">{rule.kind} • {rule.state || 'draft'}</p>
                      {validationResults[idx].errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          {validationResults[idx].errors.map((err, i) => (
                            <div key={i}>• {err}</div>
                          ))}
                        </div>
                      )}
                      {validationResults[idx].warnings.length > 0 && (
                        <div className="mt-2 text-sm text-yellow-600">
                          {validationResults[idx].warnings.map((warn, i) => (
                            <div key={i}>⚠ {warn}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep('upload')} variant="outline">
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validationResults.filter(r => r.valid).length === 0}
                className="flex-1"
              >
                Import {validationResults.filter(r => r.valid).length} Valid Rule(s)
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

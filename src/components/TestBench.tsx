import { useState, useEffect } from 'react';
import { Rule, TestCase, TestResult, TestReport } from '@/types/rule';
import { RuleEvaluator } from '@/utils/ruleEvaluator';
import { generateDiff, formatDiffValue } from '@/utils/diffUtils';
import { useTestCases } from '@/hooks/useTestCases';
import { useAppContext } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Play, Save, Download, Plus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestBenchProps {
  rule: Rule;
  open: boolean;
  onClose: () => void;
}

export function TestBench({ rule, open, onClose }: TestBenchProps) {
  const { items } = useAppContext();
  const { testCases, saveTestCase, deleteTestCase } = useTestCases(rule.id);
  const [results, setResults] = useState<TestResult[]>([]);
  const [newTestName, setNewTestName] = useState('');
  const [testInput, setTestInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [activeTab, setActiveTab] = useState('run');

  const evaluator = new RuleEvaluator();

  const loadSampleData = () => {
    if (items.length > 0) {
      const sample = items[0];
      setTestInput(JSON.stringify(sample, null, 2));
    }
  };

  const runTest = async (testCase: TestCase): Promise<TestResult> => {
    const startTime = performance.now();
    try {
      const result = evaluator.evaluate(rule, testCase.input);
      const endTime = performance.now();
      
      const diff = generateDiff(testCase.expectedOutput, result.output);
      const passed = diff.length === 0 && result.success;

      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.output,
        executionTime: endTime - startTime,
        error: result.error,
        diff,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: null,
        executionTime: endTime - startTime,
        error: String(error),
        timestamp: new Date().toISOString()
      };
    }
  };

  const runAllTests = async () => {
    const testResults = await Promise.all(testCases.map(runTest));
    setResults(testResults);
    setActiveTab('results');
  };

  const saveNewTest = async () => {
    try {
      const input = JSON.parse(testInput);
      const expected = JSON.parse(expectedOutput);
      
      const testCase: TestCase = {
        id: `test_${Date.now()}`,
        ruleId: rule.id,
        name: newTestName || `Test ${testCases.length + 1}`,
        input,
        expectedOutput: expected,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await saveTestCase(testCase);
      setNewTestName('');
      setTestInput('');
      setExpectedOutput('');
    } catch (error) {
      alert('Invalid JSON in input or expected output');
    }
  };

  const exportReport = () => {
    const report: TestReport = {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleVersion: rule.version,
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      results,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${rule.id}-${Date.now()}.json`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Bench: {rule.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="run">Run Tests</TabsTrigger>
            <TabsTrigger value="create">Create Test</TabsTrigger>
            <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="run" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {testCases.length} test case(s) available
              </p>
              <Button onClick={runAllTests} disabled={testCases.length === 0}>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </Button>
            </div>

            <div className="space-y-2">
              {testCases.map(tc => (
                <Card key={tc.id}>
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <CardTitle className="text-sm">{tc.name}</CardTitle>
                    <Button size="sm" variant="destructive" onClick={() => deleteTestCase(tc.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Input
              placeholder="Test name"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
            />
            <Button onClick={loadSampleData} variant="outline" size="sm">
              Load Sample from Items
            </Button>
            <Textarea
              placeholder="Input (JSON)"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <Textarea
              placeholder="Expected Output (JSON)"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <Button onClick={saveNewTest}>
              <Save className="w-4 h-4 mr-2" />
              Save Test Case
            </Button>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {results.length > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {results.filter(r => r.passed).length} Passed
                  </Badge>
                  <Badge variant="outline" className="bg-red-50">
                    <XCircle className="w-3 h-3 mr-1" />
                    {results.filter(r => !r.passed).length} Failed
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {results.reduce((s, r) => s + r.executionTime, 0).toFixed(2)}ms
                  </Badge>
                </div>
                <Button onClick={exportReport} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            )}

            {results.map(result => (
              <Card key={result.testCaseId} className={result.passed ? 'border-green-200' : 'border-red-200'}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      {result.testCaseName}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {result.executionTime.toFixed(2)}ms
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.error && (
                    <div className="p-2 bg-red-50 text-red-800 text-xs rounded">
                      Error: {result.error}
                    </div>
                  )}
                  {result.diff && result.diff.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Differences:</p>
                      {result.diff.map((d, i) => (
                        <div key={i} className="text-xs p-2 bg-gray-50 rounded">
                          <span className="font-mono">{d.path}</span>:{' '}
                          {d.type === 'changed' && (
                            <>
                              <span className="text-red-600">{formatDiffValue(d.oldValue)}</span>
                              {' → '}
                              <span className="text-green-600">{formatDiffValue(d.newValue)}</span>
                            </>
                          )}
                          {d.type === 'added' && (
                            <span className="text-green-600">+{formatDiffValue(d.newValue)}</span>
                          )}
                          {d.type === 'removed' && (
                            <span className="text-red-600">-{formatDiffValue(d.oldValue)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

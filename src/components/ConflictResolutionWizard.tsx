import React, { useState, useEffect } from 'react';
import { Rule, RuleConflict } from '../types/rule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import { getResolutionStrategies, previewResolution, ResolutionStrategy, ResolutionPreview } from '../utils/conflictResolution';

interface ConflictResolutionWizardProps {
  conflict: RuleConflict;
  allRules: Rule[];
  open: boolean;
  onClose: () => void;
  onResolve: (modifiedRules: Rule[], rulesToDelete?: string[], resolutionData?: {
    strategy: string;
    conflictDescription: string;
    resolutionDescription: string;
  }) => void;
}


export const ConflictResolutionWizard: React.FC<ConflictResolutionWizardProps> = ({
  conflict,
  allRules,
  open,
  onClose,
  onResolve
}) => {
  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy | null>(null);
  const [preview, setPreview] = useState<ResolutionPreview | null>(null);
  const [strategies, setStrategies] = useState<ResolutionStrategy[]>([]);

  useEffect(() => {
    if (open) {
      const availableStrategies = getResolutionStrategies(conflict, allRules);
      setStrategies(availableStrategies);
      setStep('select');
      setSelectedStrategy(null);
      setPreview(null);
    }
  }, [open, conflict, allRules]);

  const handleStrategySelect = (strategy: ResolutionStrategy) => {
    setSelectedStrategy(strategy);
    const resolutionPreview = previewResolution(strategy, conflict, allRules);
    setPreview(resolutionPreview);
    setStep('preview');
  };

  const handleApplyResolution = () => {
    if (!preview || !selectedStrategy) return;

    const rulesToDelete: string[] = [];
    if (selectedStrategy.type === 'merge') {
      rulesToDelete.push(conflict.ruleId, conflict.conflictingRuleId);
    }

    const rule1 = allRules.find(r => r.id === conflict.ruleId);
    const rule2 = allRules.find(r => r.id === conflict.conflictingRuleId);

    const resolutionData = {
      strategy: selectedStrategy.type,
      conflictDescription: `${conflict.type}: ${conflict.message} (Rules: ${rule1?.name} vs ${rule2?.name})`,
      resolutionDescription: preview.changesSummary.join('; ')
    };

    onResolve(preview.modifiedRules, rulesToDelete, resolutionData);
    onClose();
  };


  const rule1 = allRules.find(r => r.id === conflict.ruleId);
  const rule2 = allRules.find(r => r.id === conflict.conflictingRuleId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Resolve Conflict: {conflict.type.replace(/_/g, ' ').toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={`flex items-center gap-2 ${step === 'select' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">1</div>
            <span>Select Strategy</span>
          </div>
          <ArrowRight className="text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">2</div>
            <span>Preview Changes</span>
          </div>
          <ArrowRight className="text-gray-400" />
          <div className={`flex items-center gap-2 ${step === 'confirm' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">3</div>
            <span>Confirm</span>
          </div>
        </div>

        {/* Step 1: Select Strategy */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Conflicting Rules:</h3>
              <div className="space-y-2 text-sm">
                <div><strong>{rule1?.name}</strong> ({rule1?.state})</div>
                <div><strong>{rule2?.name}</strong> ({rule2?.state})</div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{conflict.message}</p>
            </div>

            <h3 className="font-semibold">Choose a Resolution Strategy:</h3>
            <div className="grid gap-3">
              {strategies.map(strategy => (
                <Card 
                  key={strategy.id}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleStrategySelect(strategy)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {strategy.name}
                      <Badge variant={strategy.applicable ? 'default' : 'secondary'}>
                        {strategy.applicable ? 'Recommended' : 'Available'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Preview Changes */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Preview: {selectedStrategy?.name}</h3>
              <Button variant="outline" size="sm" onClick={() => setStep('select')}>
                Back
              </Button>
            </div>

            {/* Changes Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Changes Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {preview.changesSummary.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Before/After Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Before</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preview.originalRules.map(rule => (
                    <div key={rule.id} className="p-3 bg-gray-50 rounded border">
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Priority: {rule.priority || 0} | State: {rule.state}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">After</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preview.modifiedRules.map(rule => (
                    <div key={rule.id} className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="font-medium text-sm">{rule.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Priority: {rule.priority || 0} | State: {rule.state}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Validation Result */}
            <Card className={preview.remainingConflicts.length === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {preview.remainingConflicts.length === 0 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Conflict Resolved!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-800">
                        {preview.remainingConflicts.length} conflict(s) remaining
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === 'preview' && preview && preview.remainingConflicts.length === 0 && (
            <Button onClick={handleApplyResolution} className="bg-green-600 hover:bg-green-700">
              Apply Resolution
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

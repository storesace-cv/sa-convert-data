import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, User, GitBranch, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useRuleHistory } from '@/hooks/useRuleHistory';
import { useApprovals } from '@/hooks/useApprovals';
import { Rule, RuleVersion } from '@/types/rule';
import { generateDiff } from '@/utils/diffUtils';

interface VersionHistoryProps {
  rule: Rule;
  open: boolean;
  onClose: () => void;
  onRollback: (rule: Rule) => void;
}


export function VersionHistory({ rule, open, onClose, onRollback }: VersionHistoryProps) {
  const { history, rollback } = useRuleHistory(open ? rule.id : null);
  const { getTimelineByRule } = useApprovals();
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const approvalTimeline = getTimelineByRule(rule.id);


  const handleRollback = async (versionNumber: number) => {
    const rolledBackRule = await rollback(versionNumber, 'Current User');
    if (rolledBackRule) {
      onRollback(rolledBackRule);
      onClose();
    }
  };

  const handleCompare = (v1: number, v2: number) => {
    setSelectedVersions([Math.min(v1, v2), Math.max(v1, v2)]);
  };

  const renderDiff = () => {
    if (!selectedVersions || !history) return null;
    const [v1Num, v2Num] = selectedVersions;
    const v1 = history.versions.find(v => v.versionNumber === v1Num);
    const v2 = history.versions.find(v => v.versionNumber === v2Num);
    if (!v1 || !v2) return null;

    const diff = generateDiff(v1.rule, v2.rule);
    return (
      <div className="border rounded-lg p-4 mt-4 bg-slate-50">
        <h4 className="font-semibold mb-3">Comparing v{v1Num} → v{v2Num}</h4>
        <ScrollArea className="h-64">
          {diff.map((item, idx) => (
            <div key={idx} className={`p-2 mb-1 rounded text-sm ${
              item.type === 'added' ? 'bg-green-100' :
              item.type === 'removed' ? 'bg-red-100' :
              item.type === 'changed' ? 'bg-yellow-100' : 'bg-white'
            }`}>
              <span className="font-mono text-xs">{item.path}</span>
              {item.type === 'changed' && (
                <div className="mt-1">
                  <div className="text-red-600">- {JSON.stringify(item.oldValue)}</div>
                  <div className="text-green-600">+ {JSON.stringify(item.newValue)}</div>
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Version History: {rule.name}
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowTimeline(!showTimeline)}>
              {showTimeline ? 'Hide' : 'Show'} Approval Timeline
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {showTimeline && approvalTimeline.length > 0 && (
          <div className="border rounded-lg p-4 mb-4 bg-blue-50">
            <h4 className="font-semibold mb-3">Approval Timeline</h4>
            <div className="space-y-2">
              {approvalTimeline.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-sm">
                  {event.action === 'approved' && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />}
                  {event.action === 'rejected' && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                  {event.action === 'requested' && <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />}
                  {event.action === 'completed' && <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium">{event.action.toUpperCase()}</p>
                    <p className="text-muted-foreground">{event.actor} {event.actorRole && `(${event.actorRole})`}</p>
                    {event.comments && <p className="text-xs italic">{event.comments}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="h-96">
          {history?.versions.slice().reverse().map((version) => (
            <VersionCard
              key={version.versionNumber}
              version={version}
              isCurrent={version.versionNumber === history.currentVersion}
              onRollback={handleRollback}
              onCompare={(vNum) => {
                if (selectedVersions?.[0] === vNum) setSelectedVersions(null);
                else if (!selectedVersions) setSelectedVersions([vNum, vNum]);
                else handleCompare(selectedVersions[0], vNum);
              }}
              isSelected={selectedVersions?.includes(version.versionNumber)}
            />
          ))}
        </ScrollArea>
        {renderDiff()}

      </DialogContent>
    </Dialog>
  );
}

function VersionCard({ version, isCurrent, onRollback, onCompare, isSelected }: any) {
  return (
    <div className={`border rounded-lg p-4 mb-3 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isCurrent ? 'default' : 'outline'}>v{version.versionNumber}</Badge>
            <Badge variant="secondary">{version.changeType}</Badge>
          </div>
          <p className="text-sm font-medium mb-1">{version.changeSummary}</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{version.author}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(version.timestamp).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onCompare(version.versionNumber)}>
            <GitBranch className="w-4 h-4" />
          </Button>
          {!isCurrent && (
            <Button size="sm" variant="outline" onClick={() => onRollback(version.versionNumber)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

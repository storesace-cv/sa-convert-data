import { useState } from 'react';
import { ApprovalRequest, ApproverRole, Rule } from '@/types/rule';
import { useApprovals } from '@/hooks/useApprovals';
import { useRuleRegistry } from '@/hooks/useRuleRegistry';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { detectConflictsForRule, canPromoteToProduction } from '@/utils/realtimeConflictDetector';

export function ApprovalsTab() {
  const { approvalRequests, approveRequest, rejectRequest, getPendingApprovals } = useApprovals();
  const { rules } = useRuleRegistry();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [approverRole, setApproverRole] = useState<ApproverRole>('manager');
  const [approverName, setApproverName] = useState('Current User');

  const pendingApprovals = getPendingApprovals();

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    // Check for conflicts before approving promotion to production
    if (actionType === 'approve' && selectedRequest.toState === 'prod') {
      const ruleToApprove = rules.find(r => r.id === selectedRequest.ruleId);
      if (ruleToApprove) {
        const conflicts = detectConflictsForRule(ruleToApprove, rules, ruleToApprove.id);
        if (!canPromoteToProduction(conflicts)) {
          alert('Cannot approve: This rule has conflicts that must be resolved before promotion to production.');
          return;
        }
      }
    }

    if (actionType === 'approve') {
      await approveRequest(selectedRequest.id, approverName, approverRole, comments);
    } else {
      await rejectRequest(selectedRequest.id, approverName, approverRole, comments);
    }

    setSelectedRequest(null);
    setActionType(null);
    setComments('');
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={variants[status as keyof typeof variants]}>{status}</Badge>;
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Approval Requests</h2>
        <p className="text-muted-foreground">Review and approve rule promotions</p>
      </div>

      <div className="grid gap-4">
        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending approvals
            </CardContent>
          </Card>
        ) : (
          pendingApprovals.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{request.ruleName}</CardTitle>
                    <CardDescription>
                      Version {request.ruleVersion} • Requested by {request.requestedBy}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{request.fromState}</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="outline">{request.toState}</Badge>
                </div>

                {request.comments && (
                  <p className="text-sm text-muted-foreground">{request.comments}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {new Date(request.requestedAt).toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType('approve');
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedRequest(request);
                      setActionType('reject');
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Role</label>
              <Select value={approverRole} onValueChange={(v) => setApproverRole(v as ApproverRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="senior_engineer">Senior Engineer</SelectItem>
                  <SelectItem value="qa_lead">QA Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add your comments..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button onClick={handleAction}>
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

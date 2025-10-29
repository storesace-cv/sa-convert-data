import { useState, useEffect } from 'react';
import { ApprovalRequest, Approval, ApprovalTimeline, ApprovalStatus, ApproverRole, RuleState } from '@/types/rule';
import { useIndexedDB } from './useIndexedDB';
import { supabase } from '@/lib/supabase';


const sendEmailNotification = async (
  type: 'approval_requested' | 'approval_granted' | 'approval_rejected' | 'rule_promoted',
  to: string[],
  ruleName: string,
  ruleDescription: string,
  ruleStage: string,
  requesterName: string,
  requesterEmail: string,
  approverRole?: string,
  comments?: string
) => {
  try {
    const appUrl = window.location.origin;
    await supabase.functions.invoke('send-approval-notification', {
      body: {
        type,
        to,
        ruleName,
        ruleDescription,
        ruleStage,
        requesterName,
        requesterEmail,
        approverRole,
        comments,
        appUrl,
      },
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
};

// Helper function to get approver emails based on roles
const getApproverEmails = (roles: ApproverRole[]): string[] => {
  // In a real application, this would query a user database
  // For demo purposes, returning mock emails
  const roleEmailMap: Record<ApproverRole, string> = {
    'admin': 'admin@storesace.com',
    'manager': 'manager@storesace.com',
    'supervisor': 'supervisor@storesace.com',
    'analyst': 'analyst@storesace.com',
  };
  
  return roles.map(role => roleEmailMap[role]).filter(Boolean);
};

export function useApprovals() {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [timelines, setTimelines] = useState<ApprovalTimeline[]>([]);
  const { getAll, add, update, getById } = useIndexedDB<ApprovalRequest>('approvalRequests');
  const timelineDB = useIndexedDB<ApprovalTimeline>('approvalTimelines');

  useEffect(() => {
    loadApprovals();
    loadTimelines();
  }, []);

  const loadApprovals = async () => {
    const data = await getAll();
    setApprovalRequests(data);
  };

  const loadTimelines = async () => {
    const data = await timelineDB.getAll();
    setTimelines(data);
  };



  const createApprovalRequest = async (
    ruleId: string,
    ruleName: string,
    ruleVersion: string,
    fromState: RuleState,
    toState: RuleState,
    requestedBy: string,
    requiredApprovers: ApproverRole[],
    comments?: string,
    ruleDescription?: string
  ) => {
    const stage = fromState === 'draft' ? 'draft_to_staging' : 'staging_to_production';
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      ruleId,
      ruleName,
      ruleVersion,
      requestedBy,
      requestedAt: new Date().toISOString(),
      stage,
      fromState,
      toState,
      status: 'pending',
      requiredApprovers,
      approvals: [],
      comments,
    };

    await add(request);
    
    const timeline: ApprovalTimeline = {
      id: crypto.randomUUID(),
      ruleId,
      requestId: request.id,
      action: 'requested',
      actor: requestedBy,
      timestamp: new Date().toISOString(),
      comments,
      fromState,
      toState,
    };
    await timelineDB.add(timeline);

    // Send email notification to approvers
    const approverEmails = getApproverEmails(requiredApprovers);
    if (approverEmails.length > 0) {
      await sendEmailNotification(
        'approval_requested',
        approverEmails,
        ruleName,
        ruleDescription || 'No description provided',
        fromState,
        requestedBy,
        requestedBy, // Using requestedBy as email for demo
        requiredApprovers.join(', '),
        comments
      );
    }

    await loadApprovals();
    await loadTimelines();
    return request;
  };


  const approveRequest = async (
    requestId: string,
    approver: string,
    approverRole: ApproverRole,
    comments?: string
  ) => {
    const request = await getById(requestId);
    if (!request) return;

    const approval: Approval = {
      id: crypto.randomUUID(),
      approvalRequestId: requestId,
      approver,
      approverRole,
      status: 'approved',
      comments,
      timestamp: new Date().toISOString(),
    };

    request.approvals.push(approval);
    
    if (request.approvals.length >= request.requiredApprovers.length) {
      request.status = 'approved';
    }

    await update(requestId, request);

    const timeline: ApprovalTimeline = {
      id: crypto.randomUUID(),
      ruleId: request.ruleId,
      requestId,
      action: request.status === 'approved' ? 'completed' : 'approved',
      actor: approver,
      actorRole: approverRole,
      timestamp: new Date().toISOString(),
      comments,
    };
    await timelineDB.add(timeline);

    // Send email notification to requester
    await sendEmailNotification(
      'approval_granted',
      [request.requestedBy],
      request.ruleName,
      'Rule approval granted',
      request.toState,
      approver,
      approver,
      approverRole,
      comments
    );

    await loadApprovals();
    await loadTimelines();
  };


  const rejectRequest = async (
    requestId: string,
    approver: string,
    approverRole: ApproverRole,
    comments?: string
  ) => {
    const request = await getById(requestId);
    if (!request) return;

    const approval: Approval = {
      id: crypto.randomUUID(),
      approvalRequestId: requestId,
      approver,
      approverRole,
      status: 'rejected',
      comments,
      timestamp: new Date().toISOString(),
    };

    request.approvals.push(approval);
    request.status = 'rejected';

    await update(requestId, request);

    const timeline: ApprovalTimeline = {
      id: crypto.randomUUID(),
      ruleId: request.ruleId,
      requestId,
      action: 'rejected',
      actor: approver,
      actorRole: approverRole,
      timestamp: new Date().toISOString(),
      comments,
    };
    await timelineDB.add(timeline);

    // Send email notification to requester
    await sendEmailNotification(
      'approval_rejected',
      [request.requestedBy],
      request.ruleName,
      'Rule approval rejected',
      request.fromState,
      approver,
      approver,
      approverRole,
      comments
    );

    await loadApprovals();
    await loadTimelines();
  };

  const promoteRule = async (
    ruleId: string,
    ruleName: string,
    toState: RuleState,
    promotedBy: string,
    notifyEmails: string[]
  ) => {
    // Send promotion notification
    await sendEmailNotification(
      'rule_promoted',
      notifyEmails,
      ruleName,
      `Rule promoted to ${toState}`,
      toState,
      promotedBy,
      promotedBy,
      undefined,
      undefined
    );
  };


  const getRequestsByRule = (ruleId: string) => {
    return approvalRequests.filter(req => req.ruleId === ruleId);
  };

  const getTimelineByRule = (ruleId: string) => {
    return timelines.filter(t => t.ruleId === ruleId).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const getPendingApprovals = () => {
    return approvalRequests.filter(req => req.status === 'pending');
  };

  return {
    approvalRequests,
    timelines,
    createApprovalRequest,
    approveRequest,
    rejectRequest,
    promoteRule,
    getRequestsByRule,
    getTimelineByRule,
    getPendingApprovals,
  };
}


import {apiCall} from './client';

export type PendingApprovalDto = {
  id: string;
  actionDescription?: string;
  impactSummary?: string;
  status?: string;
};

export async function fetchPendingApprovals(): Promise<PendingApprovalDto[]> {
  const rows = await apiCall<PendingApprovalDto[]>(
    '/ai/copilot/agent/approvals?page=0&size=50',
  );
  return Array.isArray(rows) ? rows : [];
}

export async function approveCopilotAction(approvalId: string): Promise<void> {
  await apiCall(`/ai/copilot/agent/approvals/${approvalId}/approve`, {
    method: 'POST',
  });
}

export async function rejectCopilotAction(
  approvalId: string,
  reason?: string,
): Promise<void> {
  await apiCall(`/ai/copilot/agent/approvals/${approvalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({reason: reason ?? 'Rejected on mobile'}),
  });
}

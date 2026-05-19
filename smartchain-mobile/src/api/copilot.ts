import {apiCall} from './client';

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

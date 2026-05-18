import {apiClient} from '../../api/client';
import {roleDashboardPath} from '../../utils/roles';
import type {AppRole} from '../../utils/roles';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  runId?: string;
}

export interface CopilotRunUpdate {
  status: 'running' | 'completed' | 'failed';
  content: string;
  runId?: string;
}

type AgentRunResponse = {
  runId?: string;
  status?: string;
  response?: {answer?: string};
};

function mapRoleToApi(role: string): string {
  const known: AppRole[] = [
    'CEO',
    'CFO',
    'SALES_MANAGER',
    'OPS_MANAGER',
    'HR_MANAGER',
    'MARKETING_MANAGER',
    'ACCOUNTING_CONTROLLER',
  ];
  if (known.includes(role as AppRole)) {
    return roleDashboardPath(role as AppRole);
  }
  return role.toLowerCase();
}

class MobileCopilotService {
  async startRun(
    question: string,
    role: string,
    onUpdate: (update: CopilotRunUpdate) => void,
  ): Promise<void> {
    const {data} = await apiClient.post<AgentRunResponse>(
      '/ai/copilot/agent/run',
      {
        role: mapRoleToApi(role),
        question,
        dryRun: false,
      },
    );

    onUpdate({
      status: 'completed',
      content: data.response?.answer ?? 'No response generated',
      runId: data.runId,
    });
  }

  cancelRun(): void {
    // Reserved for SSE streaming via react-native-event-source
  }
}

export const copilotService = new MobileCopilotService();

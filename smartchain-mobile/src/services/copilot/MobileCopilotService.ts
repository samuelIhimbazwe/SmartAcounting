import {apiClient} from '../../api/client';
import {roleDashboardPath} from '../../utils/roles';
import type {AppRole} from '../../utils/roles';
import {streamCopilotQuery} from './streamCopilotQuery';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  runId?: string;
  streamFallback?: boolean;
}

export interface CopilotRunUpdate {
  status: 'running' | 'completed' | 'failed';
  content: string;
  runId?: string;
  streamFallback?: boolean;
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
  private activeCleanup: (() => void) | null = null;

  async startRun(
    question: string,
    role: string,
    onUpdate: (update: CopilotRunUpdate) => void,
  ): Promise<void> {
    const {store} = require('../../store') as typeof import('../../store');
    const {accessToken, tenantId, userId} = store.getState().auth;

    if (!accessToken) {
      await this.fallbackSync(question, role, onUpdate);
      return;
    }

    return new Promise(resolve => {
      let content = '';
      this.activeCleanup = streamCopilotQuery(
        question,
        role,
        accessToken,
        tenantId,
        userId,
        chunk => {
          content += chunk;
          onUpdate({status: 'running', content});
        },
        () => {
          this.activeCleanup = null;
          onUpdate({status: 'completed', content});
          resolve();
        },
        () => {
          this.activeCleanup = null;
          void this.fallbackSync(question, role, update => {
            onUpdate({...update, streamFallback: true});
            resolve();
          });
        },
      );
    });
  }

  private async fallbackSync(
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
    this.activeCleanup?.();
    this.activeCleanup = null;
  }
}

export const copilotService = new MobileCopilotService();

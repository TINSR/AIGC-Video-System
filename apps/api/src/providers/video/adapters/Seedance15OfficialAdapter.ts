import type { SeedanceRenderInput, SeedanceRenderOutput, SeedanceTaskStatus } from '@shared/types/ai-providers';

export class Seedance15OfficialAdapter {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  // Seedance 1.5 官方API — 未实现，直接返回 failed 触发 FFmpeg fallback
  async render(_input: SeedanceRenderInput): Promise<SeedanceRenderOutput> {
    return {
      taskId: `seedance-placeholder-${Date.now()}`,
      status: 'failed',
      progress: 0,
      errorMessage: 'Seedance 1.5 official adapter not implemented yet, fallback to FFmpeg',
    };
  }

  async getTaskStatus(taskId: string): Promise<SeedanceTaskStatus> {
    return {
      taskId,
      status: 'failed',
      progress: 0,
      errorMessage: 'Seedance 1.5 official adapter not implemented yet',
    };
  }
}

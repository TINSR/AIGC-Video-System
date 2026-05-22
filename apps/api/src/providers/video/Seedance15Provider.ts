import { v4 as uuidv4 } from 'uuid';
import type {
  Seedance15Provider as ISeedance15Provider,
  SeedanceRenderInput,
  SeedanceRenderOutput,
  SeedanceTaskStatus
} from '@shared/types/ai-providers';
import { Seedance15OfficialAdapter } from './adapters/Seedance15OfficialAdapter';

export class Seedance15Provider implements ISeedance15Provider {
  private adapter: Seedance15OfficialAdapter;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SEEDANCE_API_KEY;
    this.adapter = new Seedance15OfficialAdapter(this.apiKey);
  }

  async render(input: SeedanceRenderInput): Promise<SeedanceRenderOutput> {
    // 检查API Key是否存在，不存在则返回降级提示
    if (!this.apiKey) {
      return {
        taskId: uuidv4(),
        status: 'failed',
        progress: 0,
        errorMessage: 'Seedance API Key未配置，将自动使用FFmpeg兜底合成',
      };
    }

    try {
      // 调用适配器的渲染接口
      return await this.adapter.render(input);
    } catch (error) {
      return {
        taskId: uuidv4(),
        status: 'failed',
        progress: 0,
        errorMessage: `Seedance渲染失败：${error instanceof Error ? error.message : '未知错误'}，将自动使用FFmpeg兜底合成`,
      };
    }
  }

  async getTaskStatus(taskId: string): Promise<SeedanceTaskStatus> {
    if (!this.apiKey) {
      return {
        taskId,
        status: 'failed',
        progress: 0,
        errorMessage: 'Seedance API Key未配置',
      };
    }

    try {
      return await this.adapter.getTaskStatus(taskId);
    } catch (error) {
      return {
        taskId,
        status: 'failed',
        progress: 0,
        errorMessage: `查询任务状态失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }
}

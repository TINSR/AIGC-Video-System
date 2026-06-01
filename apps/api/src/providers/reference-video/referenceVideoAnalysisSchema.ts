import { z } from 'zod';
import type { ReferenceVideoAnalysis } from '@shared/types';
import type { IReferenceVideoAnalysisProvider } from './IReferenceVideoAnalysisProvider';

const analysisSchema = z.object({
  summary: z.string().min(1),
  hookType: z.string().min(1),
  sellingPoints: z.array(z.string()).min(1),
  style: z.string().min(1),
  scenes: z.array(z.object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    goal: z.string().min(1),
    summary: z.string().min(1),
  })).min(1),
  ctaType: z.string().min(1),
  keywords: z.array(z.string()).min(1),
});

export function parseReferenceVideoAnalysis(raw: unknown): ReferenceVideoAnalysis {
  return analysisSchema.parse(raw);
}

export function truncateErrorMessage(message: string, max = 500): string {
  const trimmed = message.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 3)}...`;
}

export class MockReferenceVideoAnalysisProvider implements IReferenceVideoAnalysisProvider {
  isConfigured(): boolean {
    return true;
  }

  async analyze(_playableUrl: string, context: { title: string; category: string }): Promise<ReferenceVideoAnalysis> {
    return {
      summary: `参考视频「${context.title}」的 Mock 拆解：${context.category} 类目短视频，强调痛点开场与产品卖点展示。`,
      hookType: 'pain_point_question',
      sellingPoints: ['便携易用', '场景代入', '限时优惠'],
      style: 'TikTok 快节奏电商广告',
      scenes: [
        { startTime: '00:00', endTime: '00:03', goal: 'hook', summary: '抛出用户痛点问题' },
        { startTime: '00:03', endTime: '00:08', goal: 'feature', summary: '展示产品核心功能' },
        { startTime: '00:08', endTime: '00:12', goal: 'cta', summary: '引导点击购买' },
      ],
      ctaType: 'shop_now',
      keywords: [context.category, '带货', '转化'],
    };
  }
}

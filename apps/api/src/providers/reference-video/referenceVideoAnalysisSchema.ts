import { z } from 'zod';
import type { ReferenceVideoAnalysis } from '@shared/types';
import type { IReferenceVideoAnalysisProvider } from './IReferenceVideoAnalysisProvider';

const timePattern = /^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
const trimmedText = z.string().trim().min(1).max(500);

const analysisSchema = z.object({
  summary: trimmedText,
  hookType: trimmedText,
  sellingPoints: z.array(trimmedText).min(1).max(20),
  style: trimmedText,
  scenes: z.array(z.object({
    startTime: z.string().regex(timePattern, 'startTime must use HH:MM:SS'),
    endTime: z.string().regex(timePattern, 'endTime must use HH:MM:SS'),
    goal: trimmedText,
    summary: trimmedText,
  })).min(1).max(12),
  ctaType: trimmedText,
  keywords: z.array(trimmedText).min(1).max(20),
});

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function parseReferenceVideoAnalysis(raw: unknown): ReferenceVideoAnalysis {
  const parsed = analysisSchema.parse(raw);
  return {
    ...parsed,
    sellingPoints: dedupe(parsed.sellingPoints),
    keywords: dedupe(parsed.keywords),
  };
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
        { startTime: '00:00:00', endTime: '00:00:03', goal: 'hook', summary: '抛出用户痛点问题' },
        { startTime: '00:00:03', endTime: '00:00:08', goal: 'feature', summary: '展示产品核心功能' },
        { startTime: '00:00:08', endTime: '00:00:12', goal: 'cta', summary: '引导点击购买' },
      ],
      ctaType: 'shop_now',
      keywords: [context.category, '带货', '转化'],
    };
  }
}

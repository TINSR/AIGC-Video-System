import type { ReferenceVideoAnalysis } from '@shared/types';
import type { IReferenceVideoAnalysisProvider } from './IReferenceVideoAnalysisProvider';
import { MockReferenceVideoAnalysisProvider } from './referenceVideoAnalysisSchema';
import { parseReferenceVideoAnalysis, truncateErrorMessage } from './referenceVideoAnalysisSchema';

interface VideoAnalysisConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'video_url'; video_url: { url: string } };

export class DoubaoReferenceVideoAnalysisProvider implements IReferenceVideoAnalysisProvider {
  private config: VideoAnalysisConfig | null;
  private fallback: MockReferenceVideoAnalysisProvider;

  constructor() {
    const apiKey = process.env.REFERENCE_VIDEO_ANALYSIS_API_KEY || process.env.REAL_LLM_API_KEY;
    this.config = apiKey
      ? {
          apiKey,
          baseUrl: (process.env.REFERENCE_VIDEO_ANALYSIS_BASE_URL || process.env.REAL_LLM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, ''),
          model: process.env.REFERENCE_VIDEO_ANALYSIS_MODEL || process.env.REAL_LLM_MODEL || '',
          timeoutMs: Math.max(Number(process.env.REFERENCE_VIDEO_ANALYSIS_TIMEOUT_MS) || 120000, 10000),
        }
      : null;
    this.fallback = new MockReferenceVideoAnalysisProvider();
  }

  isConfigured(): boolean {
    return this.config !== null && Boolean(this.config.model);
  }

  async analyze(playableUrl: string, context: { title: string; category: string }): Promise<ReferenceVideoAnalysis> {
    if (!this.config || !this.config.model) {
      return this.fallback.analyze(playableUrl, context);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const systemPrompt = `你是电商短视频分析专家。观看参考视频后，只输出严格 JSON，不要其他文本。
schema:
{
  "summary": "整体摘要",
  "hookType": "开场类型，如 pain_point_question / scenario / testimonial",
  "sellingPoints": ["卖点1","卖点2"],
  "style": "视频风格",
  "scenes": [{"startTime":"00:00","endTime":"00:03","goal":"hook","summary":"分镜说明"}],
  "ctaType": "cta 类型，如 shop_now / learn_more",
  "keywords": ["关键词"]
}
要求：只分析结构与灵感，不要逐字复制字幕；不要声称复刻原视频。`;

      const userContent: ContentPart[] = [
        {
          type: 'text',
          text: `分析以下参考视频（标题：${context.title}，类目：${context.category}），提取可用于新商品剧本的结构化灵感。`,
        },
        { type: 'video_url', video_url: { url: playableUrl } },
      ];

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`视频理解 API 失败: HTTP ${response.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const content = this.extractContent(data);
      if (!content) {
        throw new Error('视频理解 API 返回空内容');
      }

      const jsonText = this.extractJsonBlock(content);
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error('视频理解输出不是有效 JSON');
      }

      return parseReferenceVideoAnalysis(parsed);
    } catch (error) {
      const message = truncateErrorMessage(error instanceof Error ? error.message : String(error));
      throw new Error(message);
    } finally {
      clearTimeout(timer);
    }
  }

  private extractContent(data: Record<string, unknown>): string | undefined {
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!choices?.length) return undefined;
    const message = choices[0].message as Record<string, unknown> | undefined;
    return typeof message?.content === 'string' ? message.content : undefined;
  }

  private extractJsonBlock(content: string): string {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) return content.slice(start, end + 1);
    return content.trim();
  }
}

export function createReferenceVideoAnalysisProvider(): IReferenceVideoAnalysisProvider {
  const doubao = new DoubaoReferenceVideoAnalysisProvider();
  return doubao.isConfigured() ? doubao : new MockReferenceVideoAnalysisProvider();
}

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { ITtsProvider, TtsResult } from './ITtsProvider';

function getProviderConfig() {
  const apiKey = process.env.MIMO_API_KEY || '';
  const baseUrl = (process.env.MIMO_TTS_BASE_URL || 'https://api.xiaomimimo.com/v1').replace(/\/$/, '');
  const model = process.env.MIMO_TTS_MODEL || 'mimo-v2.5-tts';
  const voice = process.env.TTS_VOICE || '冰糖';
  const stylePrompt = process.env.MIMO_TTS_STYLE_PROMPT || '使用自然、亲切、有活力的中文电商短视频口播风格，语速稍快，商品卖点适当重读。';
  const timeoutMs = parseInt(process.env.MIMO_TTS_TIMEOUT_MS || '30000', 10);
  return { apiKey, baseUrl, model, voice, stylePrompt, timeoutMs };
}

function buildApiUrl(baseUrl: string): string {
  if (baseUrl.endsWith('/chat/completions')) return baseUrl;
  return `${baseUrl}/chat/completions`;
}

export class XiaomiMimoTtsProvider implements ITtsProvider {
  isConfigured(): boolean {
    const { apiKey } = getProviderConfig();
    return apiKey.length > 0;
  }

  async synthesize(text: string): Promise<TtsResult | undefined> {
    if (!this.isConfigured()) return undefined;

    const { apiKey, baseUrl, model, voice, stylePrompt, timeoutMs } = getProviderConfig();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(buildApiUrl(baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: stylePrompt },
            { role: 'assistant', content: text },
          ],
          audio: { format: 'wav', voice },
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[XiaomiMimoTts] API ${response.status}`);
        return undefined;
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { audio?: { data?: string } } }>;
      };

      const audioBase64 = data.choices?.[0]?.message?.audio?.data;
      if (!audioBase64) {
        console.warn('[XiaomiMimoTts] No audio data in response');
        return undefined;
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');
      if (audioBuffer.length === 0) {
        console.warn('[XiaomiMimoTts] Empty audio buffer');
        return undefined;
      }

      const outputDir = path.resolve(process.env.OUTPUT_DIR || './outputs');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const filename = `tts_${randomUUID()}.wav`;
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, audioBuffer);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
        console.warn('[XiaomiMimoTts] Written file is empty or missing');
        return undefined;
      }

      const duration = estimateDuration(text);

      return {
        audioUrl: `/outputs/${filename}`,
        localFilePath: filePath,
        duration,
      };
    } catch (error) {
      console.warn('[XiaomiMimoTts] Failed:', error instanceof Error ? error.message : error);
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function estimateDuration(text: string): number {
  const charCount = text.replace(/\s/g, '').length;
  return Math.max(1, Math.round(charCount / 4));
}

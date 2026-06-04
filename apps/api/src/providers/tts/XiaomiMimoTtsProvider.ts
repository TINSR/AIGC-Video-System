import * as fs from 'fs';
import * as path from 'path';
import type { ITtsProvider, TtsResult } from './ITtsProvider';

export class XiaomiMimoTtsProvider implements ITtsProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private voice: string;

  constructor() {
    this.apiKey = process.env.MIMO_API_KEY || '';
    this.baseUrl = (process.env.MIMO_TTS_BASE_URL || 'https://api.mimo.ai/v1').replace(/\/$/, '');
    this.model = process.env.MIMO_TTS_MODEL || 'mimo-tts';
    this.voice = process.env.TTS_VOICE || 'default';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async synthesize(text: string): Promise<TtsResult | undefined> {
    if (!this.isConfigured()) return undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
          voice: this.voice,
          response_format: 'mp3',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[XiaomiMimoTts] TTS API ${response.status}`);
        return undefined;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) return undefined;

      const outputDir = path.resolve(process.env.OUTPUT_DIR || './outputs');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const filename = `tts_${Date.now()}.mp3`;
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, buffer);

      return {
        audioUrl: `/outputs/${filename}`,
        duration: estimateDuration(text),
      };
    } catch (error) {
      console.warn('[XiaomiMimoTts] TTS failed:', error instanceof Error ? error.message : error);
      return undefined;
    }
  }
}

function estimateDuration(text: string): number {
  // Rough estimate: ~4 Chinese characters per second
  const charCount = text.replace(/\s/g, '').length;
  return Math.max(1, Math.round(charCount / 4));
}

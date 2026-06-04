import type { ITtsProvider, TtsResult } from './ITtsProvider';

/**
 * No-op TTS provider. Always returns undefined.
 * Used as fallback when real TTS is unavailable or fails.
 * Does NOT block video generation — subtitle-only mode.
 */
export class NoopTtsProvider implements ITtsProvider {
  async synthesize(_text: string): Promise<TtsResult | undefined> {
    return undefined;
  }
}

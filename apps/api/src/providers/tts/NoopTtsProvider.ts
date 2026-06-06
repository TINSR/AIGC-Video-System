import type { ITtsProvider, TtsResult } from './ITtsProvider';

export class NoopTtsProvider implements ITtsProvider {
  async synthesize(_text: string): Promise<TtsResult | undefined> {
    return undefined;
  }
}

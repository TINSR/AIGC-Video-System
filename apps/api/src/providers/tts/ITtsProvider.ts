export interface TtsResult {
  audioUrl: string;
  duration: number;
}

export interface ITtsProvider {
  /**
   * Generate speech audio from text.
   * Returns TtsResult on success, undefined on failure (non-blocking).
   */
  synthesize(text: string): Promise<TtsResult | undefined>;
}

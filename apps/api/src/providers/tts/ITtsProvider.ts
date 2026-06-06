export interface TtsResult {
  audioUrl: string;
  localFilePath: string;
  duration: number;
}

export interface ITtsProvider {
  synthesize(text: string): Promise<TtsResult | undefined>;
}

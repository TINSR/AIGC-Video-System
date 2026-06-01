export interface IReferenceVideoImportProvider {
  importByUrl(input: {
    platform: string;
    sourceUrl: string;
  }): Promise<{
    playableUrl?: string;
    metadata?: Record<string, unknown>;
  }>;
}

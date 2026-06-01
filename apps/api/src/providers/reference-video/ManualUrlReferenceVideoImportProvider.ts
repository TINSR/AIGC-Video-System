import { assertPublicHttpUrl } from '../../utils/publicUrlValidation';
import type { IReferenceVideoImportProvider } from './IReferenceVideoImportProvider';

/**
 * Day12: accepts direct playable video URLs only — no platform page parsing.
 */
export class ManualUrlReferenceVideoImportProvider implements IReferenceVideoImportProvider {
  async importByUrl(input: { platform: string; sourceUrl: string }) {
    const sourceUrl = input.sourceUrl.trim();
    assertPublicHttpUrl(sourceUrl, 'sourceUrl');
    return {
      playableUrl: sourceUrl,
      metadata: { platform: input.platform, importMode: 'manual_url' },
    };
  }
}

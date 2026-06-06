import type { ITtsProvider } from './ITtsProvider';
import { XiaomiMimoTtsProvider } from './XiaomiMimoTtsProvider';
import { NoopTtsProvider } from './NoopTtsProvider';

export function createTtsProvider(): ITtsProvider {
  const provider = new XiaomiMimoTtsProvider();
  if (provider.isConfigured()) {
    return provider;
  }
  return new NoopTtsProvider();
}

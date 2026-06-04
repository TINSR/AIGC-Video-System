import * as fs from 'fs';
import * as path from 'path';

export interface BgmAsset {
  fileUrl: string;
  name: string;
}

const BGM_DIR = path.resolve(process.env.BGM_DIR || path.join(process.cwd(), 'assets', 'bgm'));

const BGM_CATALOG: BgmAsset[] = [
  { fileUrl: 'light-commerce.mp3', name: '轻快电商' },
  { fileUrl: 'upbeat-commerce.mp3', name: '活力电商' },
];

export class BgmProvider {
  listAvailable(): BgmAsset[] {
    if (!fs.existsSync(BGM_DIR)) return [];

    return BGM_CATALOG.filter((bgm) => fs.existsSync(path.join(BGM_DIR, bgm.fileUrl)))
      .map((bgm) => ({
        ...bgm,
        fileUrl: path.join(BGM_DIR, bgm.fileUrl),
      }));
  }

  getDefault(): BgmAsset | undefined {
    const available = this.listAvailable();
    return available[0];
  }
}

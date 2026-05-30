import fs from 'fs';
import path from 'path';

/**
 * Download remote Seedance video into local outputs directory.
 * Returns local URL (/outputs/<taskId>.mp4) or null if download fails.
 */
export async function downloadVideoToOutputs(
  remoteUrl: string,
  taskId: string,
  outputDir = process.env.OUTPUT_DIR || './outputs'
): Promise<string | null> {
  try {
    if (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://')) {
      return null;
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const response = await fetch(remoteUrl);
    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = path.join(outputDir, `${taskId}.mp4`);
    fs.writeFileSync(filePath, buffer);

    return `/outputs/${taskId}.mp4`;
  } catch {
    return null;
  }
}

import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type {
  FFmpegComposeProvider as IFFmpegComposeProvider,
  FinalComposeInput,
  FinalComposeOutput,
  GenerateFromPlanInput
} from '@shared/types/ai-providers';
import type { Material } from '@shared/types';

const execAsync = promisify(exec);

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export class FFmpegComposeProvider implements IFFmpegComposeProvider {
  private ffmpegPath = 'ffmpeg';
  private tempDir = process.env.TEMP || './temp';

  constructor() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // 路径解析：将各种形式的 media URL 转为可用的本地路径
  private resolveLocalMediaPath(url: string): string | null {
    if (!url || url.trim().length === 0) return null;

    // 已存在的绝对路径
    if (path.isAbsolute(url) && fs.existsSync(url)) return url;

    // /uploads/xxx — 映射到 cwd/uploads/xxx
    if (url.startsWith('/uploads/')) {
      const local = path.resolve(process.cwd(), url.slice(1));
      return local;
    }

    // uploads/xxx（无前导 /）— 映射到 cwd/uploads/xxx
    if (url.startsWith('uploads/')) {
      const local = path.resolve(process.cwd(), url);
      return local;
    }

    // HTTP[S] URL — 暂不支持下载
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return null;
    }

    // 相对路径
    const local = path.resolve(process.cwd(), url);
    return local;
  }

  // 生成纯色背景 + 字幕的兜底片段
  private async generateSolidColorClip(
    duration: number,
    subtitle: string | undefined,
    outputPath: string
  ): Promise<void> {
    const colorFilter = 'color=c=0x1a1a2e:s=1080x1920:r=25';
    if (subtitle) {
      const escapedSubtitle = subtitle
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, "'\\''");
      await execAsync(
        `${this.ffmpegPath} -f lavfi -i "${colorFilter}" -t ${duration} -vf "drawtext=text='${escapedSubtitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10" -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
      );
    } else {
      await execAsync(
        `${this.ffmpegPath} -f lavfi -i "${colorFilter}" -t ${duration} -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
      );
    }
  }

  async compose(input: FinalComposeInput): Promise<FinalComposeOutput> {
    try {
      const { clips, bgmUrl, voiceoverUrl, outputPath, resolution = '1080p', aspectRatio = '9:16' } = input;

      if (!clips || clips.length === 0) {
        return {
          success: false,
          videoUrl: '',
          duration: 0,
          resolution,
          fileSize: 0,
          errorMessage: '没有可用的视频片段',
        };
      }

      // 确保输出目录存在
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // 生成片段
      const clipFiles: string[] = [];
      let usedFallback = false;

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const tempOutput = path.join(this.tempDir, `clip_${i}_${randomUUID()}.mp4`);
        const resolvedPath = this.resolveLocalMediaPath(clip.url);
        let clipGenerated = false;

        // 尝试使用真实素材
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          try {
            if (resolvedPath.endsWith('.jpg') || resolvedPath.endsWith('.jpeg') || resolvedPath.endsWith('.png')) {
              await execAsync(`${this.ffmpegPath} -loop 1 -i "${resolvedPath}" -t ${clip.duration} -filter_complex "[0:v]zoompan=z='min(zoom+0.001,1.2)':d=${clip.duration * 25}:s=1080x1920,fps=25[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${tempOutput}" -y`);
            } else {
              await execAsync(`${this.ffmpegPath} -i "${resolvedPath}" -t ${clip.duration} -c:v libx264 -c:a aac "${tempOutput}" -y`);
            }
            clipGenerated = true;
          } catch {
            // 素材处理失败，继续走兜底
          }
        }

        // 兜底：纯色背景 + 字幕
        if (!clipGenerated) {
          await this.generateSolidColorClip(clip.duration, clip.subtitle, tempOutput);
          usedFallback = true;
        }

        // 如果原始 clip 有 subtitle 且用的是真实素材，额外烧录字幕
        if (clip.subtitle && clipGenerated) {
          const subtitleFile = path.join(this.tempDir, `subtitle_${i}.srt`);
          this.createSubtitleFile(clip.subtitle, clip.duration, subtitleFile);

          const subtitledOutput = path.join(this.tempDir, `clip_sub_${i}_${randomUUID()}.mp4`);
          await execAsync(`${this.ffmpegPath} -i "${tempOutput}" -vf subtitles="${subtitleFile.replace(/\\/g, '/')}" -c:a copy "${subtitledOutput}" -y`);

          fs.unlinkSync(tempOutput);
          clipFiles.push(subtitledOutput);
          if (fs.existsSync(subtitleFile)) fs.unlinkSync(subtitleFile);
        } else {
          clipFiles.push(tempOutput);
        }
      }

      // 拼接所有片段
      const concatFile = path.join(this.tempDir, `concat_${randomUUID()}.txt`);
      fs.writeFileSync(concatFile, clipFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));

      const concatenatedOutput = path.join(this.tempDir, `concatenated_${randomUUID()}.mp4`);
      await execAsync(`${this.ffmpegPath} -f concat -safe 0 -i "${concatFile}" -c copy "${concatenatedOutput}" -y`);

      // 添加BGM和语音
      let finalOutput = outputPath;
      let audioInputs = '';
      let audioFilters = '';

      if (bgmUrl) audioInputs += `-i "${bgmUrl}" `;
      if (voiceoverUrl) audioInputs += `-i "${voiceoverUrl}" `;

      if (bgmUrl || voiceoverUrl) {
        if (bgmUrl && voiceoverUrl) {
          audioFilters = '-filter_complex "[1:a]volume=0.3[a1];[2:a]volume=1.0[a2];[a1][a2]amix=inputs=2:duration=first[a]" -map "[a]"';
        } else if (bgmUrl) {
          audioFilters = '-filter_complex "[1:a]volume=0.5[a]" -map "[a]"';
        } else if (voiceoverUrl) {
          audioFilters = '-map 1:a';
        }

        await execAsync(`${this.ffmpegPath} -i "${concatenatedOutput}" ${audioInputs} -map 0:v ${audioFilters} -c:v copy -c:a aac "${finalOutput}" -y`);
      } else {
        if (fs.existsSync(finalOutput)) fs.unlinkSync(finalOutput);
        fs.renameSync(concatenatedOutput, finalOutput);
      }

      // 清理临时文件
      clipFiles.forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
      if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
      if (fs.existsSync(concatenatedOutput) && concatenatedOutput !== finalOutput) {
        fs.unlinkSync(concatenatedOutput);
      }

      const duration = await this.getVideoDuration(finalOutput, clips);
      const stats = fs.statSync(finalOutput);

      return {
        success: true,
        videoUrl: finalOutput,
        duration,
        resolution,
        fileSize: stats.size,
      };
    } catch (error) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        resolution: input.resolution || '1080p',
        fileSize: 0,
        errorMessage: `FFmpeg 合成失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  async generateFromPlan(input: GenerateFromPlanInput): Promise<FinalComposeOutput> {
    const { plan, materials, outputPath, bgmUrl } = input;

    if (!plan.scenes || plan.scenes.length === 0) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        resolution: '1080p',
        fileSize: 0,
        errorMessage: '创意方案无分镜，无法合成视频',
      };
    }

    // 转换CreativePlan为FFmpeg输入格式
    // 素材不存在时仍然生成 clip 对象 — compose 会走兜底
    const clips = plan.scenes.map(scene => {
      const material = materials.find(m => m.id === scene.materialId) || materials[0];
      const fileUrl = material?.fileUrl ?? '';
      return {
        url: fileUrl,
        duration: scene.duration,
        subtitle: scene.subtitle,
      };
    });

    return this.compose({
      clips,
      bgmUrl,
      outputPath,
      resolution: '1080p',
      aspectRatio: '9:16',
    });
  }

  // 创建字幕文件
  private createSubtitleFile(text: string, duration: number, filePath: string): void {
    const srtContent = `1
${formatSrtTime(0)} --> ${formatSrtTime(duration)}
${text}
`;
    fs.writeFileSync(filePath, srtContent, 'utf8');
  }

  // 获取视频时长 — 纯 Node.js 解析，不依赖 grep
  private async getVideoDuration(
    filePath: string,
    clips: { duration: number }[]
  ): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `"${this.ffmpegPath.replace('ffmpeg', 'ffprobe')}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) return parsed;
    } catch {
      try {
        const { stderr } = await execAsync(`"${this.ffmpegPath}" -i "${filePath}" -f null -`);
        const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
        }
      } catch (e: unknown) {
        const execError = e as { stderr?: string };
        if (execError.stderr) {
          const match = execError.stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
          if (match) {
            return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
          }
        }
      }
    }
    return clips.reduce((sum, clip) => sum + clip.duration, 0);
  }

  // TTS生成语音（预留占位）
  private async generateVoiceover(_text: string, _voice: string): Promise<string> {
    // TODO: 实现TTS语音生成
    return '';
  }
}

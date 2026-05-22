import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
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

export class FFmpegComposeProvider implements IFFmpegComposeProvider {
  private ffmpegPath = 'ffmpeg';
  private tempDir = process.env.TEMP || './temp';

  constructor() {
    // 确保临时目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
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

      // 验证第一个片段路径存在
      for (const clip of clips) {
        if (!clip.url || clip.url.trim().length === 0) {
          return {
            success: false,
            videoUrl: '',
            duration: 0,
            resolution,
            fileSize: 0,
            errorMessage: '片段 fileUrl 为空',
          };
        }
      }

      // 生成片段处理脚本
      const clipFiles: string[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const tempOutput = path.join(this.tempDir, `clip_${i}_${uuidv4()}.mp4`);

        // 处理单个片段：图片的话生成视频，视频的话裁剪到指定时长
        if (clip.url.endsWith('.jpg') || clip.url.endsWith('.jpeg') || clip.url.endsWith('.png')) {
          if (!fs.existsSync(clip.url)) {
            return {
              success: false,
              videoUrl: '',
              duration: 0,
              resolution,
              fileSize: 0,
              errorMessage: `素材文件不存在：${clip.url}`,
            };
          }
          await execAsync(`${this.ffmpegPath} -loop 1 -i "${clip.url}" -t ${clip.duration} -filter_complex "[0:v]zoompan=z='min(zoom+0.001,1.2)':d=${clip.duration * 25}:s=1080x1920,fps=25[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${tempOutput}" -y`);
        } else {
          if (!fs.existsSync(clip.url)) {
            return {
              success: false,
              videoUrl: '',
              duration: 0,
              resolution,
              fileSize: 0,
              errorMessage: `素材文件不存在：${clip.url}`,
            };
          }
          await execAsync(`${this.ffmpegPath} -i "${clip.url}" -t ${clip.duration} -c:v libx264 -c:a aac "${tempOutput}" -y`);
        }

        // 添加字幕
        if (clip.subtitle) {
          const subtitleFile = path.join(this.tempDir, `subtitle_${i}.srt`);
          this.createSubtitleFile(clip.subtitle, clip.duration, subtitleFile);

          const subtitledOutput = path.join(this.tempDir, `clip_sub_${i}_${uuidv4()}.mp4`);
          await execAsync(`${this.ffmpegPath} -i "${tempOutput}" -vf subtitles="${subtitleFile.replace(/\\/g, '/')}" -c:a copy "${subtitledOutput}" -y`);

          fs.unlinkSync(tempOutput);
          clipFiles.push(subtitledOutput);
          if (fs.existsSync(subtitleFile)) fs.unlinkSync(subtitleFile);
        } else {
          clipFiles.push(tempOutput);
        }
      }

      // 拼接所有片段
      const concatFile = path.join(this.tempDir, `concat_${uuidv4()}.txt`);
      fs.writeFileSync(concatFile, clipFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));

      const concatenatedOutput = path.join(this.tempDir, `concatenated_${uuidv4()}.mp4`);
      await execAsync(`${this.ffmpegPath} -f concat -safe 0 -i "${concatFile}" -c copy "${concatenatedOutput}" -y`);

      // 添加BGM和语音
      let finalOutput = outputPath;
      let audioFilters = '';
      let audioInputs = '';

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

      // 获取视频信息 — 使用 ffprobe（跨平台），fallback 到 clips 计算
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
    const { plan, materials, outputPath, bgmUrl, ttsVoice } = input;

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
    const clips = plan.scenes.map(scene => {
      const material = materials.find(m => m.id === scene.materialId) || materials[0];
      if (!material || !material.fileUrl) {
        return null;
      }
      return {
        url: material.fileUrl,
        duration: scene.duration,
        subtitle: scene.subtitle,
      };
    }).filter(Boolean) as { url: string; duration: number; subtitle?: string }[];

    if (clips.length === 0) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        resolution: '1080p',
        fileSize: 0,
        errorMessage: '无有效素材文件可合成',
      };
    }

    // TODO: TTS语音生成（预留占位）
    let voiceoverUrl: string | undefined = undefined;

    return this.compose({
      clips,
      bgmUrl,
      voiceoverUrl,
      outputPath,
      resolution: '1080p',
      aspectRatio: '9:16',
    });
  }

  // 创建字幕文件
  private createSubtitleFile(text: string, duration: number, filePath: string): void {
    const srtContent = `1
00:00:00,000 --> 00:00:${duration.toFixed(3).replace('.', ',')}
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
      // ffprobe 更可靠且跨平台
      const { stdout } = await execAsync(
        `"${this.ffmpegPath.replace('ffmpeg', 'ffprobe')}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) return parsed;
    } catch {
      // ffprobe 失败时使用 ffmpeg stderr 解析
      try {
        const { stderr } = await execAsync(`"${this.ffmpegPath}" -i "${filePath}" -f null -`);
        const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
        }
      } catch (e: any) {
        // ffmpeg 在 -f null 时总是以非零退出码返回，stderr 中仍包含 Duration 信息
        if (e.stderr) {
          const match = e.stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
          if (match) {
            return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
          }
        }
      }
    }
    // Fallback: 从 clips 计算
    return clips.reduce((sum, clip) => sum + clip.duration, 0);
  }

  // TTS生成语音（预留占位）
  private async generateVoiceover(text: string, voice: string): Promise<string> {
    // TODO: 实现TTS语音生成
    return '';
  }
}

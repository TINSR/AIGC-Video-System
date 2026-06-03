import { exec } from 'child_process';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type {
  FFmpegComposeProvider as IFFmpegComposeProvider,
  FinalComposeInput,
  FinalComposeOutput,
  GenerateFromPlanInput,
  GenerateFromSmartEditInput,
} from '@shared/types/ai-providers';
import type { Material, Scene } from '@shared/types';

const execAsync = promisify(exec);

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export class FFmpegComposeProvider implements IFFmpegComposeProvider {
  private ffmpegPath: string;
  private tempDir = process.env.TEMP || './temp';

  constructor() {
    this.ffmpegPath = this.resolveFFmpegPath();
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // 解析 FFmpeg 路径：环境变量 > 常见安装位置 > PATH
  private resolveFFmpegPath(): string {
    // 1. 环境变量指定
    if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
      return process.env.FFMPEG_PATH;
    }

    // 2. Windows 常见安装位置
    if (process.platform === 'win32') {
      const candidates = [
        path.join(process.env.APPDATA || '', 'TRAE SOLO CN/ModularData/ai-agent/vm/tools/app/ffmpeg/ffmpeg.exe'),
        'C:/ffmpeg/bin/ffmpeg.exe',
        'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
      }
    }

    // 3. 默认从 PATH 查找
    return 'ffmpeg';
  }

  // 检查 FFmpeg 是否可用
  async checkFFmpegAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const { stdout } = await execAsync(`"${this.ffmpegPath}" -version`);
      const versionMatch = stdout.match(/ffmpeg version (\S+)/);
      return {
        available: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
      };
    } catch (error) {
      return {
        available: false,
        error: `FFmpeg 不可用 (${this.ffmpegPath}): ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  // 获取带引号的 ffmpeg 路径（用于 exec 命令）
  private get quotedFFmpegPath(): string {
    return `"${this.ffmpegPath}"`;
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

  // 查找可用的中文字体文件
  private findChineseFont(): string | null {
    const candidates = [
      'C:/Windows/Fonts/msyh.ttc',     // 微软雅黑
      'C:/Windows/Fonts/simhei.ttf',    // 黑体
      'C:/Windows/Fonts/simsun.ttc',    // 宋体
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', // Linux 文泉驿
    ];
    for (const font of candidates) {
      if (fs.existsSync(font)) return font;
    }
    return null;
  }

  private escapeSubtitleFilterPath(filePath: string): string {
    return filePath
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'");
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
        .replace(/'/g, "'\\''")
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
      // 使用 fontfile 指定字体，避免 fontconfig 问题
      const fontFile = this.findChineseFont();
      const fontParam = fontFile ? `fontfile='${fontFile.replace(/\\/g, '/').replace(/:/g, '\\:')}'` : 'fontsize=48';
      await execAsync(
        `${this.quotedFFmpegPath} -f lavfi -i "${colorFilter}" -t ${duration} -vf "drawtext=text='${escapedSubtitle}':${fontParam}:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10" -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
      );
    } else {
      await execAsync(
        `${this.quotedFFmpegPath} -f lavfi -i "${colorFilter}" -t ${duration} -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
      );
    }
  }

  async compose(input: FinalComposeInput): Promise<FinalComposeOutput> {
    try {
      const ffmpegCheck = await this.checkFFmpegAvailability();
      if (!ffmpegCheck.available) {
        return {
          success: false,
          videoUrl: '',
          duration: 0,
          resolution: input.resolution || '1080p',
          fileSize: 0,
          errorMessage: `FFmpeg 不可用：${ffmpegCheck.error}\n\n安装方法：\n1. winget install Gyan.FFmpeg\n2. 或下载 https://github.com/BtbN/FFmpeg-Builds/releases 并添加到 PATH\n3. 或设置环境变量 FFMPEG_PATH 指向 ffmpeg.exe 的完整路径`,
        };
      }
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
              await execAsync(`${this.quotedFFmpegPath} -loop 1 -i "${resolvedPath}" -t ${clip.duration} -filter_complex "[0:v]zoompan=z='min(zoom+0.001,1.2)':d=${clip.duration * 25}:s=1080x1920,fps=25[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${tempOutput}" -y`);
            } else {
              await execAsync(`${this.quotedFFmpegPath} -i "${resolvedPath}" -t ${clip.duration} -c:v libx264 -c:a aac "${tempOutput}" -y`);
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
          const subtitleFilterPath = this.escapeSubtitleFilterPath(subtitleFile);
          await execAsync(`${this.quotedFFmpegPath} -i "${tempOutput}" -vf "subtitles='${subtitleFilterPath}'" -c:a copy "${subtitledOutput}" -y`);

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
      await execAsync(`${this.quotedFFmpegPath} -f concat -safe 0 -i "${concatFile}" -c copy "${concatenatedOutput}" -y`);

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

        await execAsync(`${this.quotedFFmpegPath} -i "${concatenatedOutput}" ${audioInputs} -map 0:v ${audioFilters} -c:v copy -c:a aac "${finalOutput}" -y`);
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
    const orderedScenes = [...plan.scenes].sort((a, b) => a.order - b.order);
    const clips = orderedScenes.map(scene => {
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

  async generateFromSmartEdit(input: GenerateFromSmartEditInput): Promise<FinalComposeOutput> {
    const { plan, decisions, sceneDurations, outputPath, withSubtitle = true, bgmUrl, voiceoverUrl } =
      input;

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

    const sceneById = new Map(plan.scenes.map((scene: Scene) => [scene.id, scene]));
    const orderedDecisions = [...decisions].sort((a, b) => a.sceneOrder - b.sceneOrder);
    type SmartClipInput = {
      url: string;
      duration: number;
      subtitle?: string;
      startTime?: number;
      transition?: Scene['transition'];
    };
    const clips: SmartClipInput[] = [];
    for (const decision of orderedDecisions) {
      const scene = sceneById.get(decision.sceneId);
      if (!scene || !decision.clip) {
        continue;
      }
      clips.push({
        url: decision.clip.fileUrl,
        duration: sceneDurations[scene.id] ?? scene.duration,
        subtitle: withSubtitle ? scene.subtitle : undefined,
        startTime: decision.clip.startTime,
        transition: scene.transition,
      });
    }

    if (clips.length === 0) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        resolution: '1080p',
        fileSize: 0,
        errorMessage: '智能剪辑计划没有可用片段',
      };
    }

    return this.composeSmartClips({
      clips,
      outputPath,
      bgmUrl,
      voiceoverUrl,
    });
  }

  private async composeSmartClips(input: {
    clips: Array<{
      url: string;
      duration: number;
      subtitle?: string;
      startTime?: number;
      transition?: Scene['transition'];
    }>;
    outputPath: string;
    bgmUrl?: string;
    voiceoverUrl?: string;
  }): Promise<FinalComposeOutput> {
    try {
      const ffmpegCheck = await this.checkFFmpegAvailability();
      if (!ffmpegCheck.available) {
        return {
          success: false,
          videoUrl: '',
          duration: 0,
          resolution: '1080p',
          fileSize: 0,
          errorMessage: ffmpegCheck.error,
        };
      }

      const { clips, outputPath, bgmUrl, voiceoverUrl } = input;
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const clipFiles: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const tempOutput = path.join(this.tempDir, `smart_clip_${i}_${randomUUID()}.mp4`);
        const generated = await this.renderSmartClipSegment(clip, tempOutput);
        if (!generated) {
          await this.generateSolidColorClip(clip.duration, clip.subtitle, tempOutput);
        }
        if (clip.subtitle && generated) {
          const subtitleFile = path.join(this.tempDir, `smart_sub_${i}.srt`);
          this.createSubtitleFile(clip.subtitle, clip.duration, subtitleFile);
          const subtitledOutput = path.join(this.tempDir, `smart_clip_sub_${i}_${randomUUID()}.mp4`);
          const subtitleFilterPath = this.escapeSubtitleFilterPath(subtitleFile);
          await execAsync(
            `${this.quotedFFmpegPath} -i "${tempOutput}" -vf "subtitles='${subtitleFilterPath}'" -c:a copy "${subtitledOutput}" -y`
          );
          fs.unlinkSync(tempOutput);
          clipFiles.push(subtitledOutput);
          if (fs.existsSync(subtitleFile)) {
            fs.unlinkSync(subtitleFile);
          }
        } else {
          clipFiles.push(tempOutput);
        }
      }

      const concatFile = path.join(this.tempDir, `smart_concat_${randomUUID()}.txt`);
      fs.writeFileSync(concatFile, clipFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));

      const concatenatedOutput = path.join(this.tempDir, `smart_concatenated_${randomUUID()}.mp4`);
      await execAsync(
        `${this.quotedFFmpegPath} -f concat -safe 0 -i "${concatFile}" -c copy "${concatenatedOutput}" -y`
      );

      let finalOutput = outputPath;
      let audioInputs = '';
      let audioFilters = '';
      if (bgmUrl) {
        audioInputs += `-i "${bgmUrl}" `;
      }
      if (voiceoverUrl) {
        audioInputs += `-i "${voiceoverUrl}" `;
      }

      if (bgmUrl || voiceoverUrl) {
        if (bgmUrl && voiceoverUrl) {
          audioFilters =
            '-filter_complex "[1:a]volume=0.3[a1];[2:a]volume=1.0[a2];[a1][a2]amix=inputs=2:duration=first[a]" -map "[a]"';
        } else if (bgmUrl) {
          audioFilters = '-filter_complex "[1:a]volume=0.5[a]" -map "[a]"';
        } else if (voiceoverUrl) {
          audioFilters = '-map 1:a';
        }
        await execAsync(
          `${this.quotedFFmpegPath} -i "${concatenatedOutput}" ${audioInputs} -map 0:v ${audioFilters} -c:v copy -c:a aac "${finalOutput}" -y`
        );
      } else {
        if (fs.existsSync(finalOutput)) {
          fs.unlinkSync(finalOutput);
        }
        fs.renameSync(concatenatedOutput, finalOutput);
      }

      clipFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
      if (fs.existsSync(concatFile)) {
        fs.unlinkSync(concatFile);
      }
      if (fs.existsSync(concatenatedOutput) && concatenatedOutput !== finalOutput) {
        fs.unlinkSync(concatenatedOutput);
      }

      const duration = await this.getVideoDuration(finalOutput, clips);
      const stats = fs.statSync(finalOutput);
      return {
        success: true,
        videoUrl: finalOutput,
        duration,
        resolution: '1080p',
        fileSize: stats.size,
      };
    } catch (error) {
      return {
        success: false,
        videoUrl: '',
        duration: 0,
        resolution: '1080p',
        fileSize: 0,
        errorMessage: `智能剪辑 FFmpeg 合成失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  private async renderSmartClipSegment(
    clip: {
      url: string;
      duration: number;
      startTime?: number;
    },
    outputPath: string
  ): Promise<boolean> {
    const resolvedPath = this.resolveLocalMediaPath(clip.url);
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return false;
    }

    const duration = clip.duration;
    const scaleFilter =
      'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=25';

    try {
      if (/\.(jpg|jpeg|png|webp)$/i.test(resolvedPath)) {
        await execAsync(
          `${this.quotedFFmpegPath} -loop 1 -i "${resolvedPath}" -t ${duration} -filter_complex "[0:v]zoompan=z='min(zoom+0.001,1.2)':d=${Math.max(Math.round(duration * 25), 1)}:s=1080x1920,fps=25[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
        );
        return true;
      }

      const ss = clip.startTime && clip.startTime > 0 ? `-ss ${clip.startTime}` : '';
      await execAsync(
        `${this.quotedFFmpegPath} ${ss} -i "${resolvedPath}" -t ${duration} -vf "${scaleFilter}" -an -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`
      );
      return true;
    } catch {
      return false;
    }
  }

  // 创建字幕文件
  private createSubtitleFile(text: string, duration: number, filePath: string): void {
    const srtContent = `1
${formatSrtTime(0)} --> ${formatSrtTime(duration)}
${text}
`;
    fs.writeFileSync(filePath, srtContent, 'utf8');
  }

  // 获取 ffprobe 路径
  private get ffprobePath(): string {
    const dir = path.dirname(this.ffmpegPath);
    const base = path.basename(this.ffmpegPath);
    return path.join(dir, base.replace('ffmpeg', 'ffprobe'));
  }

  // 获取视频时长 — 纯 Node.js 解析，不依赖 grep
  private async getVideoDuration(
    filePath: string,
    clips: { duration: number }[]
  ): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `"${this.ffprobePath}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) return parsed;
    } catch {
      try {
        const { stderr } = await execAsync(`${this.quotedFFmpegPath} -i "${filePath}" -f null -`);
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

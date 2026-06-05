import * as path from 'path';
import * as fs from 'fs';
import type {
  Material,
  Scene,
  MaterialClip,
  SmartEditPlan,
  SmartEditDecision,
} from '@shared/types';
import type { ClipProfile, CandidateSegment } from './types';
import type { ClipAnalysisInput } from './IClipUnderstandingProvider';
import { MaterialClipAnalyzer } from './MaterialClipAnalyzer';
import { SceneClipMatcher } from './SceneClipMatcher';
import { SceneBoundaryDetector } from './SceneBoundaryDetector';
import { ClipKeyframeExtractor } from './ClipKeyframeExtractor';
import { DoubaoClipUnderstandingProvider } from './DoubaoClipUnderstandingProvider';
import { RuleBasedClipUnderstandingProvider } from './RuleBasedClipUnderstandingProvider';
import { GlobalSceneClipOptimizer } from './GlobalSceneClipOptimizer';
import { SMART_EDIT_CLIP_ANALYSIS_CONCURRENCY } from './smartEditAlgorithmConfig';

function resolveFilePath(material: Material): string {
  const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  if (path.isAbsolute(material.fileUrl) && fs.existsSync(material.fileUrl)) {
    return material.fileUrl;
  }
  if (material.fileUrl.startsWith('/uploads/')) {
    return path.join(uploadsDir, material.fileUrl.slice('/uploads/'.length));
  }
  if (material.fileUrl.startsWith('uploads/')) {
    return path.join(uploadsDir, material.fileUrl.slice('uploads/'.length));
  }
  return path.resolve(material.fileUrl);
}

export class SmartEditPlanner {
  private clipAnalyzer: MaterialClipAnalyzer;
  private sceneMatcher: SceneClipMatcher;
  private boundaryDetector: SceneBoundaryDetector;
  private keyframeExtractor: ClipKeyframeExtractor;
  private doubaoProvider: DoubaoClipUnderstandingProvider;
  private ruleProvider: RuleBasedClipUnderstandingProvider;
  private optimizer: GlobalSceneClipOptimizer;

  constructor() {
    this.clipAnalyzer = new MaterialClipAnalyzer();
    this.sceneMatcher = new SceneClipMatcher();
    this.boundaryDetector = new SceneBoundaryDetector();
    this.keyframeExtractor = new ClipKeyframeExtractor();
    this.doubaoProvider = new DoubaoClipUnderstandingProvider();
    this.ruleProvider = new RuleBasedClipUnderstandingProvider();
    this.optimizer = new GlobalSceneClipOptimizer();
  }

  analyzeClips(materials: Material[]): MaterialClip[] {
    return this.clipAnalyzer.analyze(materials);
  }

  generatePlan(
    creativePlanId: string,
    scenes: Scene[],
    clips: MaterialClip[],
  ): SmartEditPlan {
    const decisions = this.sceneMatcher.match(scenes, clips);

    const totalDuration = decisions.reduce((sum, d) => {
      const scene = scenes.find((s) => s.id === d.sceneId);
      return sum + (scene?.duration || 3);
    }, 0);

    return {
      creativePlanId,
      decisions,
      totalDuration,
    };
  }

  analyzeAndPlan(
    creativePlanId: string,
    materials: Material[],
    scenes: Scene[],
  ): { clips: MaterialClip[]; plan: SmartEditPlan } {
    const clips = this.analyzeClips(materials);
    const plan = this.generatePlan(creativePlanId, scenes, clips);
    return { clips, plan };
  }

  /**
   * Advanced pipeline: scene boundary detection → keyframe extraction →
   * multimodal understanding → global beam search optimization.
   */
  async analyzeAndPlanAdvanced(
    creativePlanId: string,
    materials: Material[],
    scenes: Scene[],
    productContext?: {
      name: string;
      category: string;
      sellingPoints: string[];
    },
  ): Promise<{ clips: MaterialClip[]; profiles: Map<string, ClipProfile>; plan: SmartEditPlan }> {
    const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);

    // Step 1: Detect scene boundaries and create candidate segments
    const allSegments: CandidateSegment[] = [];
    for (const material of materials) {
      const filePath = resolveFilePath(material);
      const isImage = material.type === 'image';
      const segments = await this.boundaryDetector.detectSegments(material.id, filePath, isImage);
      allSegments.push(...segments);
    }

    // Step 2: Create MaterialClips from segments (for backward compatibility)
    const clips = this.segmentsToClips(materials, allSegments);

    return this.generatePlanAdvanced(
      creativePlanId,
      orderedScenes,
      clips,
      materials,
      productContext,
    );
  }

  async generatePlanAdvanced(
    creativePlanId: string,
    scenes: Scene[],
    clips: MaterialClip[],
    materials: Material[],
    productContext?: {
      name: string;
      category: string;
      sellingPoints: string[];
    },
  ): Promise<{ clips: MaterialClip[]; profiles: Map<string, ClipProfile>; plan: SmartEditPlan }> {
    const orderedScenes = [...scenes].sort((a, b) => a.order - b.order);
    const profiles = new Map<string, ClipProfile>();
    const useContext = productContext ?? {
      name: materials[0]?.title || '商品',
      category: '商品',
      sellingPoints: [],
    };

    const analysisItems = clips
      .map((clip) => {
        const material = materials.find((item) => item.id === clip.materialId);
        if (!material) return null;
        const isImage = clip.type === 'image' || material.type === 'image';
        const startTime = clip.startTime ?? 0;
        const duration = clip.duration;
        return {
          clip,
          material,
          segment: {
            materialId: material.id,
            sourceFile: resolveFilePath(material),
            startTime,
            endTime: clip.endTime ?? startTime + duration,
            duration,
            detectionMethod: isImage ? 'image' as const : 'scene_change' as const,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const segmentChunks = chunkArray(analysisItems, SMART_EDIT_CLIP_ANALYSIS_CONCURRENCY);
    for (const chunk of segmentChunks) {
      const results = await Promise.all(
        chunk.map(async ({ clip, material, segment }) => {
          const keyframes = segment.detectionMethod === 'image' && fs.existsSync(segment.sourceFile)
            ? {
                startFramePath: segment.sourceFile,
                middleFramePath: segment.sourceFile,
                endFramePath: segment.sourceFile,
              }
            : await this.keyframeExtractor.extract(segment);

          const analysisInput: ClipAnalysisInput = {
            clipId: clip.id,
            materialId: segment.materialId,
            materialTitle: material.title,
            materialTags: material.tags,
            materialDescription: material.aiDescription,
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.duration,
            isImage: segment.detectionMethod === 'image',
            keyframes,
            productName: useContext.name,
            productCategory: useContext.category,
            productSellingPoints: useContext.sellingPoints,
          };

          let profile: ClipProfile | null = null;

          // Try Doubao first, fallback to rules
          if (this.doubaoProvider.isConfigured()) {
            try {
              profile = await this.doubaoProvider.analyze(analysisInput);
            } catch (error) {
              console.warn('[SmartEditPlanner] Doubao analysis failed:', error instanceof Error ? error.message : error);
            }
          }

          if (!profile) {
            profile = await this.ruleProvider.analyze(analysisInput);
          }

          // Cleanup keyframes
          if (keyframes && segment.detectionMethod !== 'image') {
            this.keyframeExtractor.cleanup(keyframes);
          }

          return { clipId: clip.id, profile };
        }),
      );

      for (const result of results) {
        if (result) {
          profiles.set(result.clipId, result.profile);
        }
      }
    }

    const decisions = this.optimizer.optimize(orderedScenes, clips, profiles);

    const totalDuration = decisions.reduce((sum, d) => {
      const scene = scenes.find((s) => s.id === d.sceneId);
      return sum + (scene?.duration || 3);
    }, 0);

    return {
      clips,
      profiles,
      plan: {
        creativePlanId,
        decisions,
        totalDuration,
      },
    };
  }

  private segmentsToClips(materials: Material[], segments: CandidateSegment[]): MaterialClip[] {
    const { randomUUID } = require('crypto');
    const clips: MaterialClip[] = [];

    for (const seg of segments) {
      const material = materials.find((m) => m.id === seg.materialId);
      if (!material) continue;

      const isImage = seg.detectionMethod === 'image';
      const sceneType = detectSceneTypeFromMaterial(material);

      clips.push({
        id: randomUUID(),
        productId: material.productId,
        materialId: material.id,
        sourceType: 'merchant_upload',
        type: isImage ? 'image' : 'video_clip',
        fileUrl: material.fileUrl,
        thumbnailUrl: material.thumbnailUrl,
        startTime: isImage ? undefined : seg.startTime,
        endTime: isImage ? undefined : seg.endTime,
        duration: seg.duration,
        summary: buildSegmentSummary(material, seg),
        tags: [...material.tags, sceneType],
        sceneType,
        visualQuality: computeVisualQuality(material, sceneType),
        motionLevel: isImage ? 'low' : seg.duration <= 2 ? 'high' : 'medium',
        suitableGoals: defaultSuitableGoals(sceneType),
        createdAt: new Date().toISOString(),
      });
    }

    return clips;
  }
}

function detectSceneTypeFromMaterial(material: Material): MaterialClip['sceneType'] {
  const text = [material.title, ...material.tags, material.aiDescription || ''].join(' ').toLowerCase();

  if (material.role === 'product_primary') return 'product_closeup';
  if (material.role === 'product_detail') return 'detail';
  if (material.role === 'usage_scene') return 'usage_scene';
  if (material.role === 'packaging') return 'packaging';

  const keywords: Record<string, string[]> = {
    product_closeup: ['主图', '正面', '商品', '产品', '近景'],
    detail: ['细节', '拉链', '面料', '防泼水', '隔层', '材质'],
    usage_scene: ['使用', '场景', '旅行', '收纳', '户外'],
    packaging: ['包装', '开箱', '礼盒'],
    cta: ['购买', '下单', '优惠', '促销'],
  };

  for (const [type, kws] of Object.entries(keywords)) {
    if (kws.some((kw) => text.includes(kw))) return type as MaterialClip['sceneType'];
  }

  return material.type === 'image' ? 'product_closeup' : 'usage_scene';
}

function computeVisualQuality(material: Material, sceneType: string): number {
  if (material.role === 'product_primary' || material.type === 'image') return 0.9;
  if (material.role === 'product_detail') return 0.85;
  if (sceneType === 'usage_scene') return 0.75;
  return 0.7;
}

function buildSegmentSummary(material: Material, seg: CandidateSegment): string {
  const typeLabel = seg.detectionMethod === 'image' ? '图片' : `视频片段 ${seg.startTime.toFixed(1)}s-${seg.endTime.toFixed(1)}s`;
  const desc = material.aiDescription || material.title;
  return `${typeLabel}：${desc}`;
}

function defaultSuitableGoals(sceneType: string): Array<'hook' | 'feature' | 'proof' | 'cta' | 'full_demo'> {
  switch (sceneType) {
    case 'product_closeup': return ['feature', 'cta'];
    case 'detail': return ['feature', 'proof'];
    case 'usage_scene': return ['hook', 'proof'];
    case 'lifestyle': return ['hook'];
    case 'packaging': return ['proof', 'cta'];
    case 'cta': return ['cta'];
    default: return ['feature', 'proof'];
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

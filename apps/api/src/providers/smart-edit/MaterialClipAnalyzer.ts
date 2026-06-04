import { randomUUID } from 'crypto';
import type {
  Material,
  MaterialClip,
  MaterialClipSourceType,
  MaterialClipType,
  ClipSceneType,
  MotionLevel,
  SceneGoal,
} from '@shared/types';

const SCENE_TYPE_KEYWORDS: Record<ClipSceneType, string[]> = {
  product_closeup: ['主图', '正面', '商品', '产品', '近景'],
  detail: ['细节', '拉链', '面料', '防泼水', '隔层', '材质', '做工'],
  usage_scene: ['使用', '场景', '旅行', '收纳', '户外', '办公', '居家'],
  packaging: ['包装', '开箱', '礼盒'],
  cta: ['购买', '下单', '优惠', '促销', '抢购'],
  lifestyle: [],
};

const SUITABLE_GOALS_MAP: Record<ClipSceneType, SceneGoal[]> = {
  product_closeup: ['feature', 'cta'],
  detail: ['feature', 'proof'],
  usage_scene: ['hook', 'proof'],
  lifestyle: ['hook'],
  packaging: ['proof', 'cta'],
  cta: ['cta'],
};

function detectSceneType(material: Material): ClipSceneType {
  const text = [material.title, ...material.tags, material.aiDescription || '']
    .join(' ')
    .toLowerCase();

  if (material.role === 'product_primary') return 'product_closeup';
  if (material.role === 'product_detail') return 'detail';
  if (material.role === 'usage_scene') return 'usage_scene';
  if (material.role === 'packaging') return 'packaging';

  for (const [sceneType, keywords] of Object.entries(SCENE_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return sceneType as ClipSceneType;
    }
  }

  return material.type === 'image' ? 'product_closeup' : 'usage_scene';
}

function computeVisualQuality(material: Material, sceneType: ClipSceneType): number {
  if (material.role === 'product_primary' || material.type === 'image') return 0.9;
  if (material.role === 'product_detail') return 0.85;
  if (sceneType === 'usage_scene') return 0.75;
  if (material.type === 'video') return 0.7;
  return 0.65;
}

function detectMotionLevel(material: Material): MotionLevel {
  if (material.type === 'image') return 'low';

  const duration = material.duration || 5;
  if (duration <= 3) return 'high';
  if (duration <= 8) return 'medium';
  return 'low';
}

function buildSummary(material: Material): string {
  const typeLabel = material.type === 'image' ? '图片' : '视频片段';
  const roleLabel = material.role ? `（${material.role}）` : '';
  const description = material.aiDescription || material.title;
  return `${typeLabel}${roleLabel}：${description}`;
}

function buildTags(material: Material, sceneType: ClipSceneType): string[] {
  const tags = new Set<string>(material.tags);
  tags.add(sceneType);
  if (material.role) tags.add(material.role);
  return Array.from(tags);
}

function sliceVideo(material: Material, sceneType: ClipSceneType, motionLevel: MotionLevel): MaterialClip[] {
  const totalDuration = material.duration || 10;
  const clipDuration = Math.min(4, Math.max(2, totalDuration / 3));
  const clips: MaterialClip[] = [];

  let start = 0;
  let index = 0;
  while (start < totalDuration && index < 6) {
    const end = Math.min(start + clipDuration, totalDuration);
    const duration = end - start;

    clips.push({
      id: randomUUID(),
      productId: material.productId,
      materialId: material.id,
      sourceType: 'merchant_upload' as MaterialClipSourceType,
      type: 'video_clip' as MaterialClipType,
      fileUrl: material.fileUrl,
      thumbnailUrl: material.thumbnailUrl,
      startTime: Math.round(start * 100) / 100,
      endTime: Math.round(end * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      summary: buildSummary(material),
      tags: buildTags(material, sceneType),
      sceneType,
      visualQuality: computeVisualQuality(material, sceneType),
      motionLevel,
      suitableGoals: SUITABLE_GOALS_MAP[sceneType],
      createdAt: new Date().toISOString(),
    });

    start = end;
    index++;
  }

  return clips;
}

function wrapImage(material: Material, sceneType: ClipSceneType): MaterialClip {
  return {
    id: randomUUID(),
    productId: material.productId,
    materialId: material.id,
    sourceType: 'merchant_upload' as MaterialClipSourceType,
    type: 'image' as MaterialClipType,
    fileUrl: material.fileUrl,
    thumbnailUrl: material.thumbnailUrl,
    duration: 3,
    summary: buildSummary(material),
    tags: buildTags(material, sceneType),
    sceneType,
    visualQuality: computeVisualQuality(material, sceneType),
    motionLevel: 'low' as MotionLevel,
    suitableGoals: SUITABLE_GOALS_MAP[sceneType],
    createdAt: new Date().toISOString(),
  };
}

export class MaterialClipAnalyzer {
  analyze(materials: Material[]): MaterialClip[] {
    const clips: MaterialClip[] = [];

    for (const material of materials) {
      const sceneType = detectSceneType(material);
      const motionLevel = detectMotionLevel(material);

      if (material.type === 'image') {
        clips.push(wrapImage(material, sceneType));
      } else {
        clips.push(...sliceVideo(material, sceneType, motionLevel));
      }
    }

    return clips;
  }
}

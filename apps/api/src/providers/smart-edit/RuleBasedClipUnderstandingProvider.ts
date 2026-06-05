import type { ClipAnalysisInput, IClipUnderstandingProvider } from './IClipUnderstandingProvider';
import type { ClipProfile, ClipShotType, ClipCameraMotion } from './types';

const SCENE_TYPE_KEYWORDS: Record<string, string[]> = {
  product_closeup: ['主图', '正面', '商品', '产品', '近景', '完整'],
  detail: ['细节', '拉链', '面料', '防泼水', '隔层', '材质', '做工', '特写'],
  usage_scene: ['使用', '场景', '旅行', '收纳', '户外', '办公', '居家', '展示'],
  packaging: ['包装', '开箱', '礼盒', '箱子'],
  cta: ['购买', '下单', '优惠', '促销', '抢购', '立即'],
  lifestyle: ['生活', '时尚', '搭配', '日常'],
};

const GOAL_MAP: Record<string, ClipProfile['suitableGoals']> = {
  product_closeup: ['feature', 'cta'],
  detail: ['feature', 'proof'],
  usage_scene: ['hook', 'proof'],
  lifestyle: ['hook'],
  packaging: ['proof', 'cta'],
  cta: ['cta'],
};

function detectSceneType(input: ClipAnalysisInput): ClipProfile['sceneType'] {
  const text = [input.materialTitle, ...input.materialTags, input.materialDescription || '']
    .join(' ')
    .toLowerCase();

  for (const [sceneType, keywords] of Object.entries(SCENE_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return sceneType as ClipProfile['sceneType'];
    }
  }

  return input.isImage ? 'product_closeup' : 'usage_scene';
}

function detectShotType(input: ClipAnalysisInput): ClipShotType {
  const text = [input.materialTitle, ...input.materialTags].join(' ').toLowerCase();
  if (text.includes('特写') || text.includes('细节') || text.includes('近景')) return 'close_up';
  if (text.includes('全景') || text.includes('远')) return 'wide';
  if (text.includes('中景')) return 'medium';
  if (text.includes('微距') || text.includes('极近')) return 'extreme_close_up';
  return input.isImage ? 'close_up' : 'medium';
}

function detectCameraMotion(input: ClipAnalysisInput): ClipCameraMotion {
  if (input.isImage) return 'static';
  if (input.duration <= 2) return 'static';
  if (input.duration <= 5) return 'pan';
  return 'tracking';
}

function computeProductVisibility(sceneType: ClipProfile['sceneType'], isImage: boolean): number {
  if (sceneType === 'product_closeup') return 0.9;
  if (sceneType === 'detail') return 0.8;
  if (isImage) return 0.85;
  if (sceneType === 'usage_scene') return 0.5;
  return 0.3;
}

function computeVisualQuality(isImage: boolean, sceneType: ClipProfile['sceneType']): number {
  if (isImage) return 0.85;
  if (sceneType === 'product_closeup') return 0.8;
  if (sceneType === 'detail') return 0.75;
  return 0.7;
}

function computeMotionIntensity(isImage: boolean, duration: number): number {
  if (isImage) return 0.1;
  if (duration <= 2) return 0.8;
  if (duration <= 4) return 0.5;
  return 0.3;
}

function matchSellingPoints(
  input: ClipAnalysisInput,
): string[] {
  if (input.productSellingPoints.length === 0) return [];

  const text = [input.materialTitle, ...input.materialTags, input.materialDescription || '']
    .join(' ')
    .toLowerCase();

  return input.productSellingPoints.filter((sp) =>
    sp.split(/[,，、\s]+/).some((word) => word.length >= 2 && text.includes(word.toLowerCase())),
  );
}

function buildSummary(input: ClipAnalysisInput, sceneType: ClipProfile['sceneType']): string {
  const typeLabel = input.isImage ? '商品静态展示图' : `视频片段 ${input.startTime.toFixed(1)}s-${input.endTime.toFixed(1)}s`;
  const sceneLabel: Record<string, string> = {
    product_closeup: '商品主体展示',
    detail: '产品细节',
    usage_scene: '使用场景',
    packaging: '包装展示',
    lifestyle: '生活场景',
    cta: '购买引导',
  };
  const context = input.materialDescription || input.materialTitle;
  return `${typeLabel}，${sceneLabel[sceneType]}。${context}`;
}

export class RuleBasedClipUnderstandingProvider implements IClipUnderstandingProvider {
  async analyze(input: ClipAnalysisInput): Promise<ClipProfile> {
    const sceneType = detectSceneType(input);
    const shotType = detectShotType(input);
    const cameraMotion = detectCameraMotion(input);
    const sellingPoints = matchSellingPoints(input);

    const isProduct = sceneType === 'product_closeup' || sceneType === 'detail';
    const motion = computeMotionIntensity(input.isImage, input.duration);

    return {
      clipId: input.clipId,
      summary: buildSummary(input, sceneType),
      sceneType,
      productVisibility: computeProductVisibility(sceneType, input.isImage),
      visualQuality: computeVisualQuality(input.isImage, sceneType),
      startQuality: input.isImage ? 0.85 : 0.7,
      endQuality: input.isImage ? 0.85 : 0.7,
      motionIntensity: motion,
      shotType,
      cameraMotion,
      actions: input.isImage ? ['静态展示'] : ['商品展示'],
      sellingPoints,
      objects: [input.productName],
      colors: [],
      hasTextOverlay: false,
      hasPerson: false,
      suitableGoals: GOAL_MAP[sceneType] || ['feature'],
      warnings: ['使用素材标签和角色完成基础分析'],
      analysisSource: 'rule_fallback',
    };
  }
}

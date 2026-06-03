import type { ClipSceneType, MaterialRole, MotionLevel } from '@shared/types';
import type { MaterialClipDraft } from '../../modules/material-clips/materialClip.types';
import type { IMaterialClipAnalysisProvider, MaterialClipSegmentInput } from './IMaterialClipAnalysisProvider';
import { defaultSuitableGoals } from './smartEditScoring';

function roleToSceneType(role?: MaterialRole | null): ClipSceneType {
  switch (role) {
    case 'product_primary':
    case 'product_detail':
      return 'product_closeup';
    case 'usage_scene':
      return 'usage_scene';
    case 'packaging':
      return 'packaging';
    default:
      return 'detail';
  }
}

export class RuleBasedMaterialClipAnalysisProvider implements IMaterialClipAnalysisProvider {
  async analyzeSegment(input: MaterialClipSegmentInput): Promise<MaterialClipDraft> {
    const { material, productId, startTime, endTime, duration } = input;
    const isImage = material.type === 'image';
    const sceneType = roleToSceneType(material.role);
    const tags = [...material.tags];
    if (material.title && !tags.includes(material.title)) {
      tags.push(material.title);
    }

    const summary = [
      material.title,
      material.aiDescription,
      isImage ? '商品静态展示图' : `商品视频片段 ${startTime ?? 0}s-${endTime ?? duration}s`,
    ]
      .filter(Boolean)
      .join(' · ');

    const motionLevel: MotionLevel = isImage ? 'low' : duration >= 4 ? 'medium' : 'high';
    const visualQuality =
      material.role === 'product_primary' || material.isPrimary
        ? 0.9
        : isImage
          ? 0.85
          : 0.75;

    return {
      productId,
      materialId: material.id,
      sourceType: 'merchant_upload',
      type: isImage ? 'image' : 'video_clip',
      fileUrl: material.fileUrl,
      thumbnailUrl: material.thumbnailUrl,
      startTime: isImage ? undefined : startTime,
      endTime: isImage ? undefined : endTime,
      duration,
      summary,
      tags,
      sceneType,
      visualQuality,
      motionLevel,
      suitableGoals: defaultSuitableGoals(sceneType),
    };
  }
}

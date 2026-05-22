import type { IContinuityAgent, ContinuityWarning } from '@shared/types/agents';
import type { CreativePlanDraft } from '@shared/types/ai-providers';
import type { Material } from '@shared/types';

export class ContinuityAgent implements IContinuityAgent {
  async check(
    plan: CreativePlanDraft,
    materials: Material[]
  ): Promise<{ continuityWarnings: ContinuityWarning[] }> {
    const warnings: ContinuityWarning[] = [];
    const vb = plan.visualBible;

    // 1. 检查关键视觉规则是否缺失
    if (!vb.style || vb.style.trim().length === 0) {
      warnings.push({
        message: 'VisualBible 缺少 style 字段',
        type: 'colorTone',
        suggestion: '请在 VisualBible 中定义视频风格（style）',
      });
    }
    if (!vb.colorTone || vb.colorTone.trim().length === 0) {
      warnings.push({
        message: 'VisualBible 缺少 colorTone 字段',
        type: 'colorTone',
        suggestion: '请在 VisualBible 中定义色调（colorTone）',
      });
    }
    if (!vb.aspectRatio) {
      warnings.push({
        message: 'VisualBible 缺少 aspectRatio 字段',
        type: 'scene',
        suggestion: '请指定画面比例（9:16 或 16:9）',
      });
    }
    if (!vb.productAppearance || vb.productAppearance.trim().length === 0) {
      warnings.push({
        message: 'VisualBible 缺少 productAppearance 字段',
        type: 'productAppearance',
        suggestion: '请在 VisualBible 中定义商品外观描述',
      });
    }
    if (!vb.mainScenes || vb.mainScenes.length === 0) {
      warnings.push({
        message: 'VisualBible 缺少 mainScenes 字段',
        type: 'scene',
        suggestion: '请在 VisualBible 中定义至少一个主场景',
      });
    }
    if (!vb.continuityRules || vb.continuityRules.length === 0) {
      warnings.push({
        message: 'VisualBible 缺少 continuityRules 字段',
        type: 'scene',
        suggestion: '请在 VisualBible 中定义连贯性规则',
      });
    }

    // 2. 检查总时长
    const totalDuration = plan.scenes.reduce((sum, scene) => sum + scene.duration, 0);
    if (totalDuration < 3) {
      warnings.push({
        message: `视频总时长 ${totalDuration} 秒过短`,
        type: 'duration',
        suggestion: '建议增加分镜，总时长建议 3-15 秒',
      });
    } else if (totalDuration > 60) {
      warnings.push({
        message: `视频总时长 ${totalDuration} 秒过长`,
        type: 'duration',
        suggestion: '建议减少分镜时长，总时长控制在 60 秒以内',
      });
    }

    // 3. 检查转场是否覆盖所有相邻分镜
    for (let i = 0; i < plan.scenes.length - 1; i++) {
      if (!plan.scenes[i].transition) {
        warnings.push({
          message: `第 ${i + 1} 个分镜缺少转场定义`,
          type: 'scene',
          suggestion: '请为每个分镜指定转场方式（cut / fade / zoom）',
        });
      }
    }

    // 4. 检查素材 ID 是否存在
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      if (scene.materialId) {
        const material = materials.find(m => m.id === scene.materialId);
        if (!material) {
          warnings.push({
            message: `第 ${i + 1} 个分镜关联的素材 ${scene.materialId} 不存在`,
            type: 'productAppearance',
            suggestion: '请使用已上传的有效素材 ID，或置空 materialId',
          });
        }
      }
    }

    // 5. 检查是否有分镜时长异常（0 或超大值）
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      if (scene.duration <= 0) {
        warnings.push({
          message: `第 ${i + 1} 个分镜时长为 ${scene.duration} 秒，无效`,
          type: 'duration',
          suggestion: '请设置合理的分镜时长（1-15 秒）',
        });
      } else if (scene.duration > 30) {
        warnings.push({
          message: `第 ${i + 1} 个分镜时长 ${scene.duration} 秒，过长`,
          type: 'duration',
          suggestion: '单个分镜建议不超过 15 秒',
        });
      }
    }

    return { continuityWarnings: warnings };
  }
}

import type { IContinuityAgent, ContinuityWarning } from '@shared/types/agents';
import type { CreativePlanDraft } from '@shared/types/ai-providers';
import type { Material } from '@shared/types';

export class ContinuityAgent implements IContinuityAgent {
  async check(
    plan: CreativePlanDraft,
    materials: Material[]
  ): Promise<{ continuityWarnings: ContinuityWarning[] }> {
    const warnings: ContinuityWarning[] = [];

    // 1. 检查总时长
    const totalDuration = plan.scenes.reduce((sum, scene) => sum + scene.duration, 0);
    const maxDuration = plan.visualBible.maxDuration || 15;
    if (totalDuration > maxDuration) {
      warnings.push({
        message: `视频总时长${totalDuration}秒，超过最大限制${maxDuration}秒`,
        type: 'duration',
        suggestion: `建议减少分镜时长，总时长控制在${maxDuration}秒以内`,
      });
    } else if (totalDuration < 3) {
      warnings.push({
        message: `视频总时长${totalDuration}秒，过短`,
        type: 'duration',
        suggestion: '建议增加分镜，总时长建议3-15秒',
      });
    }

    // 2. 检查商品外观一致性
    const productAppearance = plan.visualBible.productAppearance.toLowerCase();
    plan.scenes.forEach((scene, index) => {
      const sceneDesc = scene.visualDescription.toLowerCase();
      const prompt = scene.seedancePrompt.toLowerCase();

      if (!sceneDesc.includes(productAppearance.split(' ')[0]) && !prompt.includes(productAppearance.split(' ')[0])) {
        warnings.push({
          message: `第${index + 1}个分镜未提及商品外观描述，可能与全局设定不一致`,
          type: 'productAppearance',
          sceneId: scene.id || `scene-${index}`,
          suggestion: '建议在分镜描述中包含商品外观特征，保持与全局visualBible一致',
        });
      }
    });

    // 3. 检查场景一致性
    const mainScenes = plan.visualBible.mainScenes.map(s => s.toLowerCase());
    plan.scenes.forEach((scene, index) => {
      const sceneDesc = scene.visualDescription.toLowerCase();
      const prompt = scene.seedancePrompt.toLowerCase();

      const hasMatchingScene = mainScenes.some(mainScene => 
        sceneDesc.includes(mainScene) || prompt.includes(mainScene)
      );

      if (!hasMatchingScene) {
        warnings.push({
          message: `第${index + 1}个分镜场景不在全局设定的主场景列表中`,
          type: 'scene',
          sceneId: scene.id || `scene-${index}`,
          suggestion: `建议使用全局设定的场景：${mainScenes.join('、')}，或更新visualBible的mainScenes`,
        });
      }
    });

    // 4. 检查色调一致性
    const colorTone = plan.visualBible.colorTone.toLowerCase();
    plan.scenes.forEach((scene, index) => {
      const prompt = scene.seedancePrompt.toLowerCase();

      if (!prompt.includes(colorTone.split(' ')[0])) {
        warnings.push({
          message: `第${index + 1}个分镜Seedance提示词未包含全局色调描述`,
          type: 'colorTone',
          sceneId: scene.id || `scene-${index}`,
          suggestion: `建议在Seedance提示词中加入"${colorTone}"，保持全局色调一致`,
        });
      }
    });

    // 5. 检查素材类型匹配
    plan.scenes.forEach((scene, index) => {
      if (scene.materialId) {
        const material = materials.find(m => m.id === scene.materialId);
        if (!material) {
          warnings.push({
            message: `第${index + 1}个分镜关联的素材${scene.materialId}不存在`,
            type: 'productAppearance',
            sceneId: scene.id || `scene-${index}`,
            suggestion: '建议使用已上传的有效素材ID',
          });
        }
      }
    });

    return { continuityWarnings: warnings };
  }
}

import prisma from '../../config/prisma';

interface SceneUpdateData {
  id: string;
  duration: number;
  transition: string;
  subtitle: string;
  voiceover: string;
  seedancePrompt: string;
  goal?: string;
  materialUsage?: string;
  negativePrompt?: string;
  previewVideoUrl?: string;
  renderStatus?: string;
}

export const getCreativePlanById = async (id: string) => {
  const plan = await prisma.creativePlan.findUnique({
    where: { id },
    include: {
      scenes: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!plan) return null;

  return plan;
};

export const batchUpdateScenes = async (planId: string, scenes: SceneUpdateData[]) => {
  const existingScenes = await prisma.scene.findMany({
    where: { creativePlanId: planId },
    select: { id: true }
  });
  const existingSceneIds = new Set(existingScenes.map(s => s.id));
  
  for (const scene of scenes) {
    if (!existingSceneIds.has(scene.id)) {
      throw new Error(`Scene ${scene.id} does not belong to plan ${planId}`);
    }
  }

  let totalDuration = 0;
  for (const scene of scenes) {
    if (scene.duration < 1 || scene.duration > 15) {
      throw new Error(`Scene ${scene.id} duration must be between 1 and 15 seconds`);
    }
    if (!scene.transition || scene.transition.trim() === '') {
      throw new Error(`Scene ${scene.id} transition cannot be empty`);
    }
    if (typeof scene.subtitle !== 'string') {
      throw new Error(`Scene ${scene.id} subtitle must be a string`);
    }
    if (typeof scene.voiceover !== 'string') {
      throw new Error(`Scene ${scene.id} voiceover must be a string`);
    }
    if (!scene.seedancePrompt || scene.seedancePrompt.trim() === '') {
      throw new Error(`Scene ${scene.id} seedancePrompt cannot be empty`);
    }
    totalDuration += scene.duration;
  }

  if (totalDuration > 15) {
    console.warn(`Total duration ${totalDuration} exceeds 15 seconds limit`);
  }

  const transaction = scenes.map((scene, index) => 
    prisma.scene.update({
      where: { id: scene.id },
      data: {
        duration: scene.duration,
        transition: scene.transition,
        subtitle: scene.subtitle,
        voiceover: scene.voiceover,
        seedancePrompt: scene.seedancePrompt,
        order: index,
        goal: scene.goal,
        materialUsage: scene.materialUsage,
        negativePrompt: scene.negativePrompt,
        previewVideoUrl: scene.previewVideoUrl,
        renderStatus: scene.renderStatus
      }
    })
  );

  await prisma.$transaction(transaction);

  return getCreativePlanById(planId);
};

export const updateScene = async (planId: string, sceneId: string, data: Partial<SceneUpdateData>) => {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, creativePlanId: planId }
  });

  if (!scene) {
    throw new Error(`Scene ${sceneId} does not belong to plan ${planId}`);
  }

  if (data.duration !== undefined && (data.duration < 1 || data.duration > 15)) {
    throw new Error('Duration must be between 1 and 15 seconds');
  }
  if (data.transition !== undefined && data.transition.trim() === '') {
    throw new Error('Transition cannot be empty');
  }
  if (data.seedancePrompt !== undefined && data.seedancePrompt.trim() === '') {
    throw new Error('Seedance prompt cannot be empty');
  }

  const updateData: any = { ...data };
  // 移除不存在的字段，保持兼容
  const allowedFields = ['duration', 'transition', 'subtitle', 'voiceover', 'seedancePrompt', 'visualDescription', 'goal', 'materialUsage', 'negativePrompt', 'previewVideoUrl', 'renderStatus'];
  Object.keys(updateData).forEach(key => {
    if (!allowedFields.includes(key)) {
      delete updateData[key];
    }
  });

  const updatedScene = await prisma.scene.update({
    where: { id: sceneId },
    data: updateData
  });

  return updatedScene;
};

export const regenerateScene = async (planId: string, sceneId: string) => {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, creativePlanId: planId }
  });

  if (!scene) {
    throw new Error(`Scene ${sceneId} does not belong to plan ${planId}`);
  }

  const regeneratedData = {
    visualDescription: `重新生成的视觉描述 ${Date.now()}`,
    subtitle: `重新生成的字幕 ${Date.now()}`,
    voiceover: `重新生成的旁白 ${Date.now()}`,
    seedancePrompt: `重新生成的Seedance提示词 ${Date.now()}`,
    transition: Math.random() > 0.5 ? 'fade' : 'cut'
  };

  const updatedScene = await prisma.scene.update({
    where: { id: sceneId },
    data: regeneratedData
  });

  return updatedScene;
};

export const approvePlan = async (planId: string) => {
  const plan = await prisma.creativePlan.update({
    where: { id: planId },
    data: { status: 'approved' }
  });

  return plan;
};

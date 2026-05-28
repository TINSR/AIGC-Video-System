import { Request, Response } from 'express';
import * as creativePlanService from './creativePlan.service';
import { z } from 'zod';
import { addRenderJob } from '../../jobs/renderQueue';
import prisma from '../../config/prisma';

const sceneSchema = z.object({
  id: z.string().min(1, 'Scene id is required'),
  duration: z.number().min(1, 'Duration must be at least 1 second').max(15, 'Duration cannot exceed 15 seconds'),
  transition: z.string().min(1, 'Transition is required'),
  subtitle: z.string(),
  voiceover: z.string(),
  seedancePrompt: z.string().min(1, 'Seedance prompt is required')
});

const batchUpdateScenesSchema = z.object({
  scenes: z.array(sceneSchema).min(1, 'At least one scene is required')
});

const updateSceneSchema = sceneSchema.partial();

export const getCreativePlan = async (req: Request, res: Response) => {
  try {
    const plan = await creativePlanService.getCreativePlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Creative plan not found' }
      });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

export const batchUpdateScenes = async (req: Request, res: Response) => {
  try {
    const validate = batchUpdateScenesSchema.safeParse(req.body);
    if (!validate.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validate.error.errors[0].message
        }
      });
    }

    const plan = await creativePlanService.batchUpdateScenes(
      req.params.id,
      validate.data.scenes
    );

    res.json({ success: true, data: plan });
  } catch (error: any) {
    if (error.message.includes('does not belong to plan')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SCENE', message: error.message }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

export const updateScene = async (req: Request, res: Response) => {
  try {
    const validate = updateSceneSchema.safeParse(req.body);
    if (!validate.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validate.error.errors[0].message
        }
      });
    }

    const scene = await creativePlanService.updateScene(
      req.params.id,
      req.params.sceneId,
      validate.data
    );

    res.json({ success: true, data: scene });
  } catch (error: any) {
    if (error.message.includes('does not belong to plan')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

export const regenerateScene = async (req: Request, res: Response) => {
  try {
    const scene = await creativePlanService.regenerateScene(
      req.params.id,
      req.params.sceneId
    );

    res.json({ success: true, data: scene });
  } catch (error: any) {
    if (error.message.includes('does not belong to plan')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

export const approvePlan = async (req: Request, res: Response) => {
  try {
    const plan = await creativePlanService.approvePlan(req.params.id);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

export const renderPlan = async (req: Request, res: Response) => {
  try {
    const plan = await creativePlanService.getCreativePlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Creative plan not found' }
      });
    }

    const task = await prisma.generationTask.create({
      data: {
        productId: plan.productId,
        creativePlanId: plan.id,
        status: 'pending',
        provider: 'seedance_1_5',
        currentStep: '任务已创建'
      }
    });

    await addRenderJob({
      taskId: task.id,
      creativePlanId: plan.id,
      productId: plan.productId,
      provider: 'seedance_1_5',
      aspectRatio: '9:16',
      withTts: true,
      withBgm: true,
      fallbackToFfmpeg: true
    });

    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
};

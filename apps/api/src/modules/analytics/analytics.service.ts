import prisma from '../../config/prisma';
import { planStore, taskStore } from '../../memory-store';
import { materialStore } from '../materials/material.service';
import type { GenerationTask } from '@shared/types';

export interface AnalyticsOverview {
  totalProducts: number;
  totalMaterials: number;
  totalCreativePlans: number;
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  recentTasks: Array<{
    date: string;
    count: number;
    success: number;
    failed: number;
  }>;
}

export class AnalyticsService {
  async getOverview(): Promise<AnalyticsOverview> {
    let totalProducts = 0;
    let totalMaterials = materialStore.size;
    let totalCreativePlans = planStore.size;
    let totalTasks = 0;
    let successTasks = 0;
    let failedTasks = 0;
    let runningTasks = 0;
    let pendingTasks = 0;
    const recentTasks: AnalyticsOverview['recentTasks'] = [];

    try {
      totalProducts = await prisma.product.count();
      totalMaterials = await prisma.material.count();
      totalCreativePlans = await prisma.creativePlan.count();

      const taskStats = await prisma.generationTask.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      for (const stat of taskStats) {
        const count = stat._count.id;
        switch (stat.status) {
          case 'success':
            successTasks = count;
            break;
          case 'failed':
            failedTasks = count;
            break;
          case 'running':
            runningTasks = count;
            break;
          case 'pending':
            pendingTasks = count;
            break;
        }
        totalTasks += count;
      }

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const dayTasks = await prisma.generationTask.findMany({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          select: { status: true },
        });

        recentTasks.push({
          date: startOfDay.toISOString().split('T')[0],
          count: dayTasks.length,
          success: dayTasks.filter(t => t.status === 'success').length,
          failed: dayTasks.filter(t => t.status === 'failed').length,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[AnalyticsService] 数据库读取失败，fallback到内存统计:', message);

      const tasks = Array.from(taskStore.values()) as GenerationTask[];
      totalTasks = tasks.length;
      successTasks = tasks.filter(t => t.status === 'success').length;
      failedTasks = tasks.filter(t => t.status === 'failed').length;
      runningTasks = tasks.filter(t => t.status === 'running').length;
      pendingTasks = tasks.filter(t => t.status === 'pending').length;

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayTasks = tasks.filter(t => t.createdAt.startsWith(dateStr));
        recentTasks.push({
          date: dateStr,
          count: dayTasks.length,
          success: dayTasks.filter(t => t.status === 'success').length,
          failed: dayTasks.filter(t => t.status === 'failed').length,
        });
      }
    }

    return {
      totalProducts,
      totalMaterials,
      totalCreativePlans,
      totalTasks,
      successTasks,
      failedTasks,
      runningTasks,
      pendingTasks,
      recentTasks,
    };
  }
}

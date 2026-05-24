import prisma from '../../config/prisma';
import { planStore, taskStore } from '../../memory-store';
import { materialStore } from '../materials/material.service';
import { GenerationTask } from '@shared/types';

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
    try {
      const [productCount] = await prisma.$queryRaw<[{ count: number }]>`SELECT COUNT(*) as count FROM Product`;
      totalProducts = productCount.count;
    } catch {
      // Prisma/DB 不可用时 fallback，使用 memory store 中的 product 数量
    }

    const tasks = Array.from(taskStore.values()) as GenerationTask[];

    const recentTasks = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter(t => t.createdAt.startsWith(dateStr));
      const success = dayTasks.filter(t => t.status === 'success').length;
      const failed = dayTasks.filter(t => t.status === 'failed').length;

      recentTasks.push({
        date: dateStr,
        count: dayTasks.length,
        success,
        failed,
      });
    }

    return {
      totalProducts,
      totalMaterials: materialStore.size,
      totalCreativePlans: planStore.size,
      totalTasks: tasks.length,
      successTasks: tasks.filter(t => t.status === 'success').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      runningTasks: tasks.filter(t => t.status === 'running').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      recentTasks,
    };
  }
}

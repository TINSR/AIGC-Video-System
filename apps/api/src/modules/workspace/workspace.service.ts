import prisma from '../../config/prisma';
import { enrichTaskOutputVideo } from '../../utils/outputVideoUrl';
import { loadTasksByIds } from '../render/taskPersistence';
import type {
  GenerationTask,
  MaterialCloudStatus,
  Product,
  WorkspaceCreativePlanSummary,
  WorkspaceMaterialSummary,
  WorkspaceNextAction,
  WorkspaceTaskItem,
} from '@shared/types';

function parseSellingPoints(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    return [raw];
  }
}

function mapProduct(record: {
  id: string;
  title: string;
  category: string;
  sellingPoints: string;
  targetAudience: string;
  usageScene: string;
  createdAt: Date;
}): Product {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    sellingPoints: parseSellingPoints(record.sellingPoints),
    targetAudience: record.targetAudience,
    usageScene: record.usageScene,
    createdAt: record.createdAt.toISOString(),
  };
}

function summarizePlan(plan: {
  id: string;
  productId: string;
  status: string;
  style: string;
  title: string;
  hook: string;
  createdAt: Date;
  _count: { scenes: number };
}): WorkspaceCreativePlanSummary {
  return {
    id: plan.id,
    productId: plan.productId,
    status: plan.status as WorkspaceCreativePlanSummary['status'],
    style: plan.style as WorkspaceCreativePlanSummary['style'],
    title: plan.title,
    hook: plan.hook,
    createdAt: plan.createdAt.toISOString(),
    scenesCount: plan._count.scenes,
  };
}

function resolveNextAction(
  materialsCount: number,
  latestPlan: WorkspaceCreativePlanSummary | undefined,
  latestTask: GenerationTask | undefined,
  hasPrimary: boolean
): WorkspaceNextAction {
  if (materialsCount === 0) return 'upload_material';
  if (!hasPrimary) return 'upload_material';
  if (!latestPlan) return 'generate_plan';
  if (latestPlan.status === 'draft') return 'review_plan';

  if (latestTask) {
    if (latestTask.status === 'pending' || latestTask.status === 'running') return 'view_task';
    if (latestTask.status === 'failed') return 'retry';
    if (latestTask.status === 'success' && latestTask.outputVideoUrl) return 'view_video';
  }

  if (latestPlan.status === 'approved') return 'render_video';
  return 'review_plan';
}

function buildMaterialsSummary(
  materials: Array<{
    id: string;
    thumbnailUrl: string | null;
    publicUrl: string | null;
    cloudStatus: string | null;
    isPrimary: boolean;
  }>
): WorkspaceMaterialSummary {
  let uploadedToCloudCount = 0;
  let localOnlyCount = 0;
  let cloudFailedCount = 0;

  for (const row of materials) {
    if (row.cloudStatus === 'uploaded') uploadedToCloudCount += 1;
    else if (row.cloudStatus === 'local_only') localOnlyCount += 1;
    else if (row.cloudStatus === 'failed') cloudFailedCount += 1;
  }

  const primary = materials.find((m) => m.isPrimary);
  return {
    primaryMaterialId: primary?.id,
    primaryThumbnailUrl: primary?.thumbnailUrl ?? undefined,
    primaryPublicUrl: primary?.publicUrl ?? undefined,
    primaryCloudStatus: (primary?.cloudStatus as MaterialCloudStatus) ?? undefined,
    uploadedToCloudCount,
    localOnlyCount,
    cloudFailedCount,
  };
}

export class WorkspaceService {
  async listWorkspaceTasks(): Promise<WorkspaceTaskItem[]> {
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { materials: true, creativePlans: true },
        },
        creativePlans: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          include: { _count: { select: { scenes: true } } },
        },
        tasks: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    const productIds = products.map((row) => row.id);
    const allMaterials =
      productIds.length > 0
        ? await prisma.material.findMany({
            where: { productId: { in: productIds } },
            select: {
              id: true,
              productId: true,
              thumbnailUrl: true,
              publicUrl: true,
              cloudStatus: true,
              isPrimary: true,
            },
          })
        : [];

    const materialsByProduct = new Map<string, typeof allMaterials>();
    for (const material of allMaterials) {
      const list = materialsByProduct.get(material.productId) ?? [];
      list.push(material);
      materialsByProduct.set(material.productId, list);
    }

    const taskIds = products
      .map((row) => row.tasks[0]?.id)
      .filter((id): id is string => typeof id === 'string');
    const taskById = await loadTasksByIds(taskIds);

    const items: WorkspaceTaskItem[] = [];

    for (const row of products) {
      const latestPlanRow = row.creativePlans[0];
      const latestPlan = latestPlanRow ? summarizePlan(latestPlanRow) : undefined;

      let latestTask: GenerationTask | undefined;
      const latestTaskRow = row.tasks[0];
      if (latestTaskRow) {
        const fromDb = taskById.get(latestTaskRow.id);
        latestTask = fromDb ? enrichTaskOutputVideo(fromDb) : undefined;
      }

      const productMaterials = materialsByProduct.get(row.id) ?? [];
      const materialsSummary = buildMaterialsSummary(productMaterials);
      const hasPrimary = productMaterials.some((m) => m.isPrimary);

      items.push({
        product: mapProduct(row),
        materialsCount: row._count.materials,
        creativePlansCount: row._count.creativePlans,
        materialsSummary,
        latestPlan,
        latestTask,
        nextAction: resolveNextAction(row._count.materials, latestPlan, latestTask, hasPrimary),
      });
    }

    return items;
  }
}

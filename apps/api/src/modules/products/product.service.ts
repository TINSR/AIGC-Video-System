import prisma from '../../config/prisma';
import { planStore, taskMaterialsStore, taskStore } from '../../memory-store';
import { materialStore } from '../materials/material.service';

type ProductRecord = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

interface CreateProductData {
  title: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  usageScene: string;
}

export const createProduct = async (data: CreateProductData) => {
  const product = await prisma.product.create({
    data: {
      ...data,
      sellingPoints: JSON.stringify(data.sellingPoints),
    },
  });

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};

export const getProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return products.map((product: ProductRecord) => ({
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  }));
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { materials: true, creativePlans: true, tasks: true },
  });

  if (!product) return null;

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};

export const updateProduct = async (id: string, data: Partial<CreateProductData>) => {
  const updateData: any = { ...data };
  if (data.sellingPoints) {
    updateData.sellingPoints = JSON.stringify(data.sellingPoints);
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;

  const deletedIds = await prisma.$transaction(async (tx) => {
    const plans = await tx.creativePlan.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const planIds = plans.map((plan) => plan.id);

    const tasks = await tx.generationTask.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const taskIds = tasks.map((task) => task.id);

    if (taskIds.length > 0) {
      await tx.taskLog.deleteMany({ where: { taskId: { in: taskIds } } });
    }
    await tx.generationTask.deleteMany({ where: { productId: id } });

    if (planIds.length > 0) {
      await tx.sceneClipMatch.deleteMany({ where: { creativePlanId: { in: planIds } } });
      await tx.scene.deleteMany({ where: { creativePlanId: { in: planIds } } });
    }
    await tx.creativePlan.deleteMany({ where: { productId: id } });
    await tx.materialClip.deleteMany({ where: { productId: id } });
    await tx.material.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });

    return { planIds, taskIds };
  });

  for (const planId of deletedIds.planIds) planStore.delete(planId);
  for (const taskId of deletedIds.taskIds) {
    taskStore.delete(taskId);
    taskMaterialsStore.delete(taskId);
  }
  for (const [materialId, material] of materialStore) {
    if (material.productId === id) materialStore.delete(materialId);
  }

  return true;
};

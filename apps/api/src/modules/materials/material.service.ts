import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../../config/prisma';
import { uploadToObjectStorage, isObjectStorageConfigured } from '../../providers/storage/objectStorage';
import type { Material, MaterialCloudStatus, MaterialRole, MaterialRoleAnalysis } from '@shared/types';

export const materialStore = new Map<string, Material>();

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.avi', '.webm']);
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

type MaterialRecord = {
  id: string;
  productId: string;
  type: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  title: string;
  tags: string;
  aiDescription: string | null;
  duration: number | null;
  publicUrl: string | null;
  cloudStatus: string | null;
  role: string | null;
  roleConfidence: number | null;
  roleReason: string | null;
  isPrimary: boolean;
  createdAt: Date;
};

type EditableMaterialFields = Omit<
  Pick<
    Material,
    | 'title'
    | 'tags'
    | 'aiDescription'
    | 'duration'
    | 'thumbnailUrl'
    | 'publicUrl'
    | 'cloudStatus'
  >,
  'publicUrl'
> & {
  publicUrl?: string | null;
};

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

function mapMaterial(record: MaterialRecord): Material {
  return {
    id: record.id,
    productId: record.productId,
    type: record.type as Material['type'],
    fileUrl: record.fileUrl,
    thumbnailUrl: record.thumbnailUrl ?? undefined,
    title: record.title,
    tags: parseTags(record.tags),
    aiDescription: record.aiDescription ?? undefined,
    duration: record.duration ?? undefined,
    role: (record.role as MaterialRole) ?? undefined,
    roleConfidence: record.roleConfidence ?? undefined,
    roleReason: record.roleReason ?? undefined,
    isPrimary: record.isPrimary,
    publicUrl: record.publicUrl ?? undefined,
    cloudStatus: (record.cloudStatus as MaterialCloudStatus) ?? undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

function pickEditableFields(data: Partial<Material> & { publicUrl?: string | null }): Partial<EditableMaterialFields> {
  const editable: Partial<EditableMaterialFields> = {};
  if (typeof data.title === 'string') editable.title = data.title;
  if (Array.isArray(data.tags)) editable.tags = data.tags.filter((tag): tag is string => typeof tag === 'string');
  if (typeof data.aiDescription === 'string') editable.aiDescription = data.aiDescription;
  if (typeof data.duration === 'number') editable.duration = data.duration;
  if (typeof data.thumbnailUrl === 'string') editable.thumbnailUrl = data.thumbnailUrl;
  if (typeof data.publicUrl === 'string' || data.publicUrl === null) editable.publicUrl = data.publicUrl;
  if (data.cloudStatus) editable.cloudStatus = data.cloudStatus;
  return editable;
}

function toPrismaUpdate(data: Partial<EditableMaterialFields>) {
  return {
    ...data,
    tags: data.tags ? JSON.stringify(data.tags) : undefined,
  };
}

function resolveContentType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

export class MaterialService {
  async listByProductId(productId: string): Promise<Material[]> {
    try {
      const records = await prisma.material.findMany({
        where: { productId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      });
      const materials = records.map(mapMaterial);
      materials.forEach((material) => materialStore.set(material.id, material));
      return materials;
    } catch (error) {
      console.warn('[MaterialService] list from database failed, falling back to memory:', error);
      return Array.from(materialStore.values())
        .filter((material) => material.productId === productId)
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    }
  }

  async upload(
    productId: string,
    file: Express.Multer.File,
    title: string,
    tags: string[]
  ): Promise<Material> {
    const id = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    if (!IMAGE_EXT.has(ext) && !VIDEO_EXT.has(ext)) {
      throw new Error('不支持的文件类型');
    }

    const type: Material['type'] = IMAGE_EXT.has(ext) ? 'image' : 'video';
    const maxSize = type === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxSize) {
      throw new Error(`文件超过大小限制（${type === 'image' ? '20MB' : '200MB'}）`);
    }

    const fileName = `${id}${ext}`;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    let cloudStatus: MaterialCloudStatus = isObjectStorageConfigured() ? 'failed' : 'local_only';
    let publicUrl: string | undefined;

    if (isObjectStorageConfigured()) {
      const objectKey = `materials/${productId}/${fileName}`;
      const upload = await uploadToObjectStorage(objectKey, file.buffer, resolveContentType(ext));
      if (upload.ok) {
        cloudStatus = 'uploaded';
        publicUrl = upload.publicUrl;
        console.info(`[MaterialService] uploaded to object storage: ${objectKey}`);
      } else {
        console.warn(`[MaterialService] cloud upload failed, keeping local file: ${upload.reason}`);
        cloudStatus = 'failed';
      }
    }

    const material: Material = {
      id,
      productId,
      type,
      fileUrl: `/uploads/${fileName}`,
      thumbnailUrl: type === 'video' ? '/assets/video-placeholder.png' : `/uploads/${fileName}`,
      title,
      tags,
      aiDescription: '',
      duration: type === 'video' ? 10 : undefined,
      isPrimary: false,
      publicUrl,
      cloudStatus,
      createdAt: new Date().toISOString(),
    };

    try {
      await prisma.material.create({
        data: {
          id: material.id,
          productId: material.productId,
          type: material.type,
          fileUrl: material.fileUrl,
          thumbnailUrl: material.thumbnailUrl ?? null,
          title: material.title,
          tags: JSON.stringify(material.tags),
          aiDescription: material.aiDescription ?? null,
          duration: material.duration ?? null,
          publicUrl: material.publicUrl ?? null,
          cloudStatus: material.cloudStatus ?? null,
          isPrimary: false,
        },
      });
    } catch (error) {
      console.warn('[MaterialService] database write failed, keeping memory fallback:', error);
    }

    materialStore.set(id, material);
    return material;
  }

  async setPrimaryMaterial(productId: string, materialId: string): Promise<Material[]> {
    const record = await prisma.material.findFirst({
      where: { id: materialId, productId },
    });

    if (!record) {
      throw new Error('素材不存在或不属于该商品');
    }
    if (record.type !== 'image') {
      throw new Error('仅图片素材可设为主图');
    }

    await prisma.$transaction([
      prisma.material.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      prisma.material.update({
        where: { id: materialId },
        data: {
          isPrimary: true,
          role: 'product_primary',
        },
      }),
    ]);

    for (const cached of materialStore.values()) {
      if (cached.productId === productId) {
        cached.isPrimary = cached.id === materialId;
        if (cached.id === materialId) {
          cached.role = 'product_primary';
        }
      }
    }

    return this.listByProductId(productId);
  }

  async getById(id: string): Promise<Material | null> {
    try {
      const record = await prisma.material.findUnique({ where: { id } });
      if (record) {
        const material = mapMaterial(record);
        materialStore.set(id, material);
        return material;
      }
    } catch (error) {
      console.warn('[MaterialService] get from database failed, falling back to memory:', error);
    }
    return materialStore.get(id) ?? null;
  }

  async update(id: string, data: Partial<Material> & { publicUrl?: string | null }): Promise<Material | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const editable = pickEditableFields(data);
    const updated: Material = {
      ...existing,
      ...editable,
      publicUrl: editable.publicUrl === null ? undefined : editable.publicUrl ?? existing.publicUrl,
    };

    try {
      await prisma.material.update({
        where: { id },
        data: toPrismaUpdate(editable),
      });
    } catch (error) {
      console.warn('[MaterialService] database update failed, keeping memory fallback:', error);
    }

    materialStore.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    try {
      await prisma.material.delete({ where: { id } });
    } catch (error) {
      console.warn('[MaterialService] database delete failed, deleting memory fallback only:', error);
    }

    materialStore.delete(id);
    return true;
  }

  async analyzeRoles(
    productId: string,
    llmCall?: (materials: Material[]) => Promise<MaterialRoleAnalysis[]>
  ): Promise<MaterialRoleAnalysis[]> {
    const imageMaterials = (await this.listByProductId(productId)).filter((material) => material.type === 'image');
    if (imageMaterials.length === 0) return [];

    let analyses: MaterialRoleAnalysis[] = [];
    if (llmCall) {
      try {
        const validIds = new Set(imageMaterials.map((material) => material.id));
        analyses = (await llmCall(imageMaterials)).filter((analysis) => validIds.has(analysis.materialId));
      } catch (error) {
        console.warn('[MaterialService] LLM role analysis failed, falling back to rules:', error);
      }
    }

    if (analyses.length === 0) {
      analyses = this.ruleBasedRoleAnalysis(imageMaterials);
    }

    for (const analysis of analyses) {
      try {
        await prisma.material.update({
          where: { id: analysis.materialId },
          data: {
            role: analysis.role,
            roleConfidence: analysis.confidence,
            roleReason: analysis.reason,
          },
        });
      } catch (error) {
        console.warn('[MaterialService] persist role analysis failed, keeping memory fallback:', error);
      }

      const existing = materialStore.get(analysis.materialId);
      if (existing) {
        materialStore.set(analysis.materialId, {
          ...existing,
          role: analysis.role,
          roleConfidence: analysis.confidence,
          roleReason: analysis.reason,
        });
      }
    }

    return analyses;
  }

  private ruleBasedRoleAnalysis(materials: Material[]): MaterialRoleAnalysis[] {
    return materials.map((material, index) => {
      const tags = material.tags.map((tag) => tag.toLowerCase());
      const title = material.title.toLowerCase();
      let role: MaterialRole = 'other';
      let reason = 'No role keyword matched';

      if (tags.includes('product') || tags.includes('主图') || tags.includes('商品') || title.includes('product') || title.includes('主图')) {
        role = 'product_primary';
        reason = 'Title or tags indicate a product overview image';
      } else if (tags.includes('detail') || tags.includes('细节') || title.includes('detail')) {
        role = 'product_detail';
        reason = 'Title or tags indicate a detail image';
      } else if (tags.includes('scene') || tags.includes('场景') || title.includes('scene')) {
        role = 'usage_scene';
        reason = 'Title or tags indicate a usage scene';
      } else if (tags.includes('packaging') || tags.includes('包装') || title.includes('pack')) {
        role = 'packaging';
        reason = 'Title or tags indicate packaging';
      } else if (index === 0) {
        role = 'product_primary';
        reason = 'First uploaded image used as rule-based default';
      }

      return {
        materialId: material.id,
        role,
        confidence: role === 'other' ? 0.3 : 0.6,
        reason,
      };
    });
  }
}

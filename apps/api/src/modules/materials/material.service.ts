import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../../config/prisma';
import type { Material } from '@shared/types';

export const materialStore = new Map<string, Material>();

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
  createdAt: Date;
};

type EditableMaterialFields = Pick<Material, 'title' | 'tags' | 'aiDescription' | 'duration' | 'thumbnailUrl'>;

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
    createdAt: record.createdAt.toISOString(),
  };
}

function pickEditableFields(data: Partial<Material>): Partial<EditableMaterialFields> {
  const editable: Partial<EditableMaterialFields> = {};
  if (typeof data.title === 'string') editable.title = data.title;
  if (Array.isArray(data.tags)) editable.tags = data.tags.filter((tag): tag is string => typeof tag === 'string');
  if (typeof data.aiDescription === 'string') editable.aiDescription = data.aiDescription;
  if (typeof data.duration === 'number') editable.duration = data.duration;
  if (typeof data.thumbnailUrl === 'string') editable.thumbnailUrl = data.thumbnailUrl;
  return editable;
}

function toPrismaUpdate(data: Partial<EditableMaterialFields>) {
  return {
    ...data,
    tags: data.tags ? JSON.stringify(data.tags) : undefined,
  };
}

export class MaterialService {
  async listByProductId(productId: string): Promise<Material[]> {
    try {
      const records = await prisma.material.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
      });
      const materials = records.map(mapMaterial);
      materials.forEach((material) => materialStore.set(material.id, material));
      return materials;
    } catch (error) {
      console.warn('[MaterialService] list from database failed, falling back to memory:', error);
      return Array.from(materialStore.values()).filter((material) => material.productId === productId);
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
    const type: Material['type'] = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? 'image' : 'video';
    const fileName = `${id}${ext}`;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

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
      createdAt: new Date().toISOString(),
    };

    try {
      await prisma.material.create({
        data: {
          ...material,
          tags: JSON.stringify(material.tags),
          duration: material.duration ?? null,
        },
      });
    } catch (error) {
      console.warn('[MaterialService] database write failed, keeping memory fallback:', error);
    }

    materialStore.set(id, material);
    return material;
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

  async update(id: string, data: Partial<Material>): Promise<Material | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const editable = pickEditableFields(data);
    const updated = { ...existing, ...editable };

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
}

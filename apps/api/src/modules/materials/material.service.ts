import { Material } from '@shared/types';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export const materialStore = new Map<string, Material>();

export class MaterialService {
  async listByProductId(productId: string): Promise<Material[]> {
    return Array.from(materialStore.values()).filter(m => m.productId === productId);
  }

  async upload(
    productId: string,
    file: Express.Multer.File,
    title: string,
    tags: string[]
  ): Promise<Material> {
    const id = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const type = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ? 'image' : 'video';

    const fileName = `${id}${ext}`;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, fileName);

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

    materialStore.set(id, material);
    return material;
  }

  async getById(id: string): Promise<Material | null> {
    return materialStore.get(id) || null;
  }

  async update(id: string, data: Partial<Material>): Promise<Material | null> {
    const material = materialStore.get(id);
    if (!material) return null;

    const updated = { ...material, ...data };
    materialStore.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return materialStore.delete(id);
  }
}

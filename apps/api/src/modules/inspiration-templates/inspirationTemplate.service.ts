import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import * as productService from '../products/product.service';
import { ReferenceVideoService } from '../reference-videos/referenceVideo.service';
import {
  createTemplateClusteringProvider,
  createTemplateRecommendationProvider,
} from '../../providers/template/templateProviders';
import type {
  InspirationTemplate,
  InspirationTemplateRecommendation,
  InspirationTemplateGenerationContext,
} from '@shared/types';
import {
  BUILTIN_TEMPLATES,
  mapTemplate,
  type InspirationTemplateRecord,
} from './inspirationTemplate.types';

export const inspirationTemplateStore = new Map<string, InspirationTemplate>();

type TemplateListQuery = {
  category?: string;
  keyword?: string;
  sourceMode?: string;
  status?: string;
};

function toJsonArray(values: string[] | undefined): Prisma.InputJsonValue {
  return (values ?? []) as unknown as Prisma.InputJsonValue;
}

export class InspirationTemplateService {
  private referenceVideoService = new ReferenceVideoService();

  async list(query: TemplateListQuery = {}): Promise<InspirationTemplate[]> {
    try {
      const records = await prisma.inspirationTemplate.findMany({ orderBy: { createdAt: 'desc' } });
      return this.filterTemplates(records.map((record) => mapTemplate(record as InspirationTemplateRecord)), query);
    } catch (error) {
      console.warn('[InspirationTemplateService] database list failed, using memory fallback:', error);
      return this.filterTemplates(Array.from(inspirationTemplateStore.values()), query);
    }
  }

  async getById(id: string): Promise<InspirationTemplate | null> {
    try {
      const record = await prisma.inspirationTemplate.findUnique({ where: { id } });
      if (record) {
        const mapped = mapTemplate(record as InspirationTemplateRecord);
        inspirationTemplateStore.set(mapped.id, mapped);
        return mapped;
      }
    } catch (error) {
      console.warn('[InspirationTemplateService] database read failed, using memory fallback:', error);
    }
    return inspirationTemplateStore.get(id) ?? null;
  }

  async create(input: Omit<InspirationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<InspirationTemplate> {
    const id = randomUUID();
    const now = new Date();
    const record: InspirationTemplateRecord = {
      id,
      name: input.name,
      category: input.category ?? null,
      description: input.description,
      strategy: input.strategy,
      hookType: input.hookType,
      style: input.style,
      factors: input.factors,
      constraints: input.constraints,
      sceneGoals: input.sceneGoals,
      tags: input.tags,
      referenceVideoIds: input.referenceVideoIds,
      sourceMode: input.sourceMode,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    const mapped = mapTemplate(record);

    try {
      await prisma.inspirationTemplate.create({
        data: this.toCreateData(mapped),
      });
    } catch (error) {
      console.warn('[InspirationTemplateService] database create failed, using memory fallback:', error);
    }

    inspirationTemplateStore.set(mapped.id, mapped);
    return mapped;
  }

  async update(id: string, patch: Partial<Omit<InspirationTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<InspirationTemplate | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: InspirationTemplate = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.inspirationTemplate.update({
        where: { id },
        data: {
          name: patch.name,
          category: patch.category === undefined ? undefined : patch.category ?? null,
          description: patch.description,
          strategy: patch.strategy,
          hookType: patch.hookType,
          style: patch.style,
          factors: patch.factors ? toJsonArray(patch.factors) : undefined,
          constraints: patch.constraints ? toJsonArray(patch.constraints) : undefined,
          sceneGoals: patch.sceneGoals ? toJsonArray(patch.sceneGoals) : undefined,
          tags: patch.tags ? toJsonArray(patch.tags) : undefined,
          referenceVideoIds: patch.referenceVideoIds ? toJsonArray(patch.referenceVideoIds) : undefined,
          sourceMode: patch.sourceMode,
          status: patch.status,
        },
      });
    } catch (error) {
      console.warn('[InspirationTemplateService] database update failed, using memory fallback:', error);
    }

    inspirationTemplateStore.set(id, updated);
    return updated;
  }

  async archive(id: string): Promise<InspirationTemplate | null> {
    return this.update(id, { status: 'archived' });
  }

  async seedBuiltins(): Promise<InspirationTemplate[]> {
    const output: InspirationTemplate[] = [];
    for (const builtin of BUILTIN_TEMPLATES) {
      const existing = await this.findBuiltinByName(builtin.name);
      if (existing) {
        output.push(existing);
        continue;
      }
      const created = await this.create(builtin);
      output.push(created);
    }
    return output;
  }

  async generateByReferences(input: { category?: string; referenceVideoIds?: string[] }): Promise<InspirationTemplate[]> {
    let references = await this.referenceVideoService.list({
      analysisStatus: 'success',
      category: input.category,
    });

    if (input.referenceVideoIds && input.referenceVideoIds.length > 0) {
      const idSet = new Set(input.referenceVideoIds);
      references = references.filter((item) => idSet.has(item.id) && item.analysisStatus === 'success' && !!item.analysis);
    } else {
      references = references.filter((item) => item.analysisStatus === 'success' && !!item.analysis);
    }

    if (references.length === 0) {
      throw new Error('NO_ANALYZED_REFERENCE_VIDEOS');
    }

    const drafts = await createTemplateClusteringProvider().cluster({
      referenceVideos: references,
      category: input.category,
    });

    const created: InspirationTemplate[] = [];
    for (const draft of drafts.slice(0, 5)) {
      created.push(
        await this.create({
          ...draft,
          status: draft.status ?? 'active',
        })
      );
    }
    return created;
  }

  async recommendForProduct(productId: string): Promise<InspirationTemplateRecommendation[]> {
    const product = await productService.getProductById(productId);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    const templates = (await this.list({ status: 'active' })).filter((item) => item.status === 'active');
    return createTemplateRecommendationProvider().recommend({
      product: {
        id: product.id,
        title: product.title,
        category: product.category,
        sellingPoints: product.sellingPoints,
        targetAudience: product.targetAudience,
        usageScene: product.usageScene,
        createdAt: product.createdAt.toISOString(),
      },
      templates,
    });
  }

  async getGenerationContext(templateId: string): Promise<InspirationTemplateGenerationContext | undefined> {
    const template = await this.getById(templateId);
    if (!template || template.status !== 'active') return undefined;
    return {
      id: template.id,
      name: template.name,
      strategy: template.strategy,
      hookType: template.hookType,
      style: template.style,
      factors: template.factors,
      constraints: template.constraints,
      sceneGoals: template.sceneGoals,
    };
  }

  private filterTemplates(items: InspirationTemplate[], query: TemplateListQuery): InspirationTemplate[] {
    let filtered = [...items];
    if (query.category) filtered = filtered.filter((item) => item.category === query.category);
    if (query.sourceMode) filtered = filtered.filter((item) => item.sourceMode === query.sourceMode);
    if (query.status) filtered = filtered.filter((item) => item.status === query.status);
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(kw)
        || (item.category?.toLowerCase().includes(kw) ?? false)
        || item.tags.some((tag) => tag.toLowerCase().includes(kw))
        || item.factors.some((factor) => factor.toLowerCase().includes(kw))
      );
    }
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private toCreateData(template: InspirationTemplate) {
    return {
      id: template.id,
      name: template.name,
      category: template.category ?? null,
      description: template.description,
      strategy: template.strategy,
      hookType: template.hookType,
      style: template.style,
      factors: toJsonArray(template.factors),
      constraints: toJsonArray(template.constraints),
      sceneGoals: toJsonArray(template.sceneGoals),
      tags: toJsonArray(template.tags),
      referenceVideoIds: toJsonArray(template.referenceVideoIds),
      sourceMode: template.sourceMode,
      status: template.status,
    };
  }

  private async findBuiltinByName(name: string): Promise<InspirationTemplate | null> {
    try {
      const record = await prisma.inspirationTemplate.findFirst({
        where: { name, sourceMode: 'built_in' },
      });
      if (record) {
        const mapped = mapTemplate(record as InspirationTemplateRecord);
        inspirationTemplateStore.set(mapped.id, mapped);
        return mapped;
      }
    } catch {
      // fallback to memory below
    }
    const fallback = Array.from(inspirationTemplateStore.values()).find(
      (item) => item.name === name && item.sourceMode === 'built_in'
    );
    return fallback ?? null;
  }
}

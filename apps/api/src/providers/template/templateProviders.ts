import type {
  InspirationTemplate,
  InspirationTemplateRecommendation,
  Product,
  ReferenceVideo,
} from '@shared/types';

export type InspirationTemplateDraft = Omit<InspirationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: InspirationTemplate['status'];
};

export interface ITemplateClusteringProvider {
  cluster(input: {
    referenceVideos: ReferenceVideo[];
    category?: string;
  }): Promise<InspirationTemplateDraft[]>;
}

export interface ITemplateRecommendationProvider {
  recommend(input: {
    product: Product;
    templates: InspirationTemplate[];
  }): Promise<InspirationTemplateRecommendation[]>;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

class RuleBasedTemplateClusteringProvider implements ITemplateClusteringProvider {
  async cluster(input: { referenceVideos: ReferenceVideo[]; category?: string }): Promise<InspirationTemplateDraft[]> {
    const groups = new Map<string, ReferenceVideo[]>();
    for (const video of input.referenceVideos) {
      if (!video.analysis) continue;
      const sceneGoals = video.analysis.scenes.map((scene) => scene.goal);
      const key = [video.analysis.hookType, video.analysis.ctaType, ...sceneGoals].join('|');
      groups.set(key, [...(groups.get(key) ?? []), video]);
    }

    return Array.from(groups.values()).map((videos, index) => {
      const first = videos[0];
      const analysis = first.analysis!;
      const category = input.category || first.category;
      return {
        name: `${category}-规则归纳模板-${index + 1}`,
        category,
        description: `基于 ${videos.length} 条已分析参考视频归纳的模板`,
        strategy: unique(videos.map((video) => video.analysis!.summary)).join(' / '),
        hookType: analysis.hookType,
        style: analysis.style,
        factors: unique(videos.flatMap((video) => video.analysis!.sellingPoints)),
        constraints: ['避免绝对化表达', '保留电商 CTA'],
        sceneGoals: analysis.scenes.map((scene) => scene.goal),
        tags: unique(videos.flatMap((video) => video.analysis!.keywords)),
        referenceVideoIds: videos.map((video) => video.id),
        sourceMode: 'rule_generated',
      };
    });
  }
}

class PlaceholderTemplateRecommendationProvider implements ITemplateRecommendationProvider {
  async recommend(input: {
    product: Product;
    templates: InspirationTemplate[];
  }): Promise<InspirationTemplateRecommendation[]> {
    const normalizedCategory = input.product.category.toLowerCase();
    const normalizedPoints = input.product.sellingPoints.map((item) => item.toLowerCase());
    return input.templates
      .filter((template) => template.status === 'active')
      .map((template) => {
        let score = 20;
        const reasons: string[] = [];

        if (template.category && template.category.toLowerCase() === normalizedCategory) {
          score += 35;
          reasons.push('模板类目与商品类目一致');
        }

        const tagHit = template.tags.some((tag) =>
          normalizedPoints.some((point) => point.includes(tag.toLowerCase()) || tag.toLowerCase().includes(point))
        );
        if (tagHit) {
          score += 25;
          reasons.push('模板标签与商品卖点存在关键词命中');
        }

        if (template.sourceMode === 'built_in') {
          score += 10;
          reasons.push('内置模板稳定性更高');
        }

        if (reasons.length === 0) {
          reasons.push('基础匹配：模板结构完整，可用于快速生成');
        }

        return { template, score: Math.min(score, 100), reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}

export function createTemplateClusteringProvider(): ITemplateClusteringProvider {
  return new RuleBasedTemplateClusteringProvider();
}

export function createTemplateRecommendationProvider(): ITemplateRecommendationProvider {
  return new PlaceholderTemplateRecommendationProvider();
}

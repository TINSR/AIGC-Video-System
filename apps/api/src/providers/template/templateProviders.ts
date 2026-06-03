import type {
  InspirationTemplate,
  InspirationTemplateRecommendation,
  TemplateRecommendationEvidence,
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

// ─── Performance Scoring ─────────────────────────────────────────

export interface PerformanceScoreInput {
  plays: number;
  clicks: number;
  conversions: number;
  averageWatchRate: number;
}

export interface PerformanceScoreOutput {
  clickRate: number;
  conversionRate: number;
  score: number;
}

export interface ITemplatePerformanceScoringProvider {
  score(input: PerformanceScoreInput): PerformanceScoreOutput;
}

export class TemplatePerformanceScoringProvider implements ITemplatePerformanceScoringProvider {
  score(input: PerformanceScoreInput): PerformanceScoreOutput {
    const { plays, clicks, conversions, averageWatchRate } = input;

    const clickRate = plays > 0 ? (clicks / plays) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const clampedWatchRate = Math.max(0, Math.min(100, averageWatchRate));

    const score = conversionRate * 0.5 + clickRate * 0.3 + clampedWatchRate * 0.2;

    return {
      clickRate: clampRate(clickRate),
      conversionRate: clampRate(conversionRate),
      score: clampRate(score),
    };
  }
}

function clampRate(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

// ─── Performance Comparison ──────────────────────────────────────

export interface TemplatePerformanceSummary {
  templateId?: string;
  templateName: string;
  sampleCount: number;
  plays: number;
  clicks: number;
  conversions: number;
  clickRate: number;
  conversionRate: number;
  averageWatchRate: number;
  score: number;
}

export interface TemplatePerformanceComparison {
  left: TemplatePerformanceSummary;
  right: TemplatePerformanceSummary;
  winnerTemplateId?: string;
  reasons: string[];
}

export interface ITemplatePerformanceComparisonProvider {
  compare(left: TemplatePerformanceSummary, right: TemplatePerformanceSummary): TemplatePerformanceComparison;
}

export class TemplatePerformanceComparisonProvider implements ITemplatePerformanceComparisonProvider {
  compare(left: TemplatePerformanceSummary, right: TemplatePerformanceSummary): TemplatePerformanceComparison {
    const reasons: string[] = [];

    const conversionDiff = Math.round((left.conversionRate - right.conversionRate) * 100) / 100;
    if (conversionDiff > 0) {
      reasons.push(`"${left.templateName}"的转化率比"${right.templateName}"高 ${conversionDiff} 个百分点`);
    } else if (conversionDiff < 0) {
      reasons.push(`"${right.templateName}"的转化率比"${left.templateName}"高 ${Math.abs(conversionDiff)} 个百分点`);
    } else {
      reasons.push('两个模板的转化率相同');
    }

    if (left.clickRate > right.clickRate) {
      reasons.push(`"${left.templateName}"的点击率更高`);
    } else if (right.clickRate > left.clickRate) {
      reasons.push(`"${right.templateName}"的点击率更高`);
    }

    if (left.averageWatchRate > right.averageWatchRate) {
      reasons.push(`"${left.templateName}"的平均完播率更高`);
    } else if (right.averageWatchRate > left.averageWatchRate) {
      reasons.push(`"${right.templateName}"的平均完播率更高`);
    }

    let winnerTemplateId: string | undefined;
    if (left.score > right.score) {
      winnerTemplateId = left.templateId;
      reasons.push(`综合评分推荐"${left.templateName}"`);
    } else if (right.score > left.score) {
      winnerTemplateId = right.templateId;
      reasons.push(`综合评分推荐"${right.templateName}"`);
    } else {
      reasons.push('两个模板综合评分相同');
    }

    return { left, right, winnerTemplateId, reasons };
  }
}

// ─── Rule-based Clustering ───────────────────────────────────────

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
        constraints: [
          '不复制参考视频字幕',
          '不混剪参考视频原片',
          '保持商品外观一致',
          '避免绝对化广告词',
        ],
        sceneGoals: analysis.scenes.map((scene) => scene.goal),
        tags: unique(videos.flatMap((video) => video.analysis!.keywords)),
        referenceVideoIds: videos.map((video) => video.id),
        sourceMode: 'rule_generated',
      };
    });
  }
}

// ─── Rule-based Recommendation with evidence ─────────────────────

class RuleBasedTemplateRecommendationProvider implements ITemplateRecommendationProvider {
  async recommend(input: {
    product: Product;
    templates: InspirationTemplate[];
  }): Promise<InspirationTemplateRecommendation[]> {
    const { product, templates } = input;
    const activeTemplates = templates.filter((t) => t.status === 'active');
    if (activeTemplates.length === 0) return [];

    const scored = activeTemplates.map((template) => {
      const { score, reasons, evidence } = scoreTemplate(template, product);
      return { template, score, reasons, evidence };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5);
  }
}

function normalizeLower(value: string): string {
  return value.trim().toLowerCase();
}

function scoreTemplate(template: InspirationTemplate, product: Product): {
  score: number;
  reasons: string[];
  evidence: TemplateRecommendationEvidence[];
} {
  let score = 0;
  const reasons: string[] = [];
  const evidence: TemplateRecommendationEvidence[] = [];

  // Category match: +40
  if (template.category && product.category) {
    const tCat = normalizeLower(template.category);
    const pCat = normalizeLower(product.category);
    if (tCat === pCat || tCat.includes(pCat) || pCat.includes(tCat)) {
      score += 40;
      reasons.push(`类目匹配"${product.category}"`);
      evidence.push({
        type: 'category_match',
        label: '类目匹配',
        detail: `模板类目"${template.category}"与商品类目"${product.category}"一致`,
      });
    }
  }

  // sellingPoints hit factors/tags: +15 each, max +30
  const allFactorsAndTags = new Set(
    [...template.factors, ...template.tags].map(normalizeLower)
  );
  const matchedPoints: string[] = [];
  for (const sp of product.sellingPoints) {
    if (allFactorsAndTags.has(normalizeLower(sp))) {
      matchedPoints.push(sp);
      reasons.push(`卖点"${sp}"命中模板因子`);
    }
  }
  if (matchedPoints.length > 0) {
    score += Math.min(matchedPoints.length * 15, 30);
    evidence.push({
      type: 'selling_point_match',
      label: '卖点命中',
      detail: `商品卖点"${matchedPoints.join('、')}"命中模板因子`,
    });
  }

  // usageScene hit tags: +15
  const usageSceneNorm = normalizeLower(product.usageScene);
  const hasSceneHit = [...template.tags].some(
    (tag) => usageSceneNorm.includes(normalizeLower(tag)) || normalizeLower(tag).includes(usageSceneNorm)
  );
  if (hasSceneHit) {
    score += 15;
    reasons.push(`使用场景"${product.usageScene}"命中模板标签`);
    evidence.push({
      type: 'usage_scene_match',
      label: '场景匹配',
      detail: `使用场景"${product.usageScene}"与模板标签匹配`,
    });
  }

  // sourceMode=rule_generated: +10
  if (template.sourceMode === 'rule_generated') {
    score += 10;
    reasons.push('基于参考视频归纳生成');
  }

  score = Math.max(0, Math.min(100, score));

  if (reasons.length === 0) {
    reasons.push('通用模板，适合多数商品');
  }

  return { score, reasons, evidence };
}

// ─── Factory functions ───────────────────────────────────────────

export function createTemplateClusteringProvider(): ITemplateClusteringProvider {
  return new RuleBasedTemplateClusteringProvider();
}

export function createTemplateRecommendationProvider(): ITemplateRecommendationProvider {
  return new RuleBasedTemplateRecommendationProvider();
}

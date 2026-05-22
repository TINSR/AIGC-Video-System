import type { IComplianceAgent, ComplianceWarning } from '@shared/types/agents';
import type { CreativePlanDraft } from '@shared/types/ai-providers';

// 绝对化广告词黑名单（《广告法》第九条）
// safeNext: 当违规词后紧跟这些字时视为日常用语，不触发告警
const FORBIDDEN_WORDS = [
  { word: '第一', safeNext: ['次', '个', '步', '天', '眼', '种', '件', '位', '站', '句', '章'], suggestion: '领先、前列、优选' },
  { word: '唯一', suggestion: '独特、少有、特别' },
  { word: '顶级', suggestion: '高端、优质、出色' },
  { word: '最高', safeNext: ['的', '级'], suggestion: '较高、出众、出色' },
  { word: '最低', safeNext: ['的'], suggestion: '实惠、优惠、高性价比' },
  { word: '最好', safeNext: ['的'], suggestion: '优秀、出色、优质' },
  { word: '最佳', suggestion: '理想、合适、优选' },
  { word: '最大', safeNext: ['的', '化', '值', '量', '限'], suggestion: '较大、大容量' },
  { word: '最小', safeNext: ['的', '化', '值'], suggestion: '小巧、便携、迷你' },
  { word: '最全', safeNext: ['的'], suggestion: '丰富、全面、多样' },
  { word: '最新', safeNext: ['款', '版', '的'], suggestion: '新款、全新、升级' },
  { word: '最先进', suggestion: '先进、前沿、领先技术' },
  { word: '永久', safeNext: ['的', '性'], suggestion: '长期、持久、耐用' },
  { word: '100%有效', suggestion: '效果出众、体验良好' },
  { word: '百分百', safeNext: ['的'], suggestion: '高比例、大部分、绝大多数' },
  { word: '绝对', safeNext: ['不', '没有', '不会', '值', '的'], suggestion: '相对、非常、相当' },
  { word: '全网最低', suggestion: '性价比高、优惠力度大、价格实惠' },
  { word: '全网第一', suggestion: '广受好评、销量领先、备受欢迎' },
  { word: '国家级', suggestion: '正规、符合国家标准、品质可靠' },
  { word: '世界级', suggestion: '国际水准、出口品质、符合国际标准' },
  { word: '第一品牌', suggestion: '知名品牌、受欢迎品牌、口碑品牌' },
  { word: '驰名商标', suggestion: '知名商标、广受认可' },
  { word: '特效', safeNext: ['药'], suggestion: '有效、效果好、针对性强' },
  { word: '包治百病', suggestion: '适用多种场景、用途广泛' },
  { word: '无效退款', suggestion: '支持7天无理由退换、售后有保障' },
];

// 按词长倒序排列，确保"全网第一"先于"第一"匹配
const SORTED_FORBIDDEN_WORDS = [...FORBIDDEN_WORDS].sort((a, b) => b.word.length - a.word.length);

export class ComplianceAgent implements IComplianceAgent {
  async check(plan: CreativePlanDraft): Promise<{ complianceWarnings: ComplianceWarning[] }> {
    const warnings: ComplianceWarning[] = [];

    const topLevelFields = [
      { name: 'title', value: plan.title },
      { name: 'hook', value: plan.hook },
      { name: 'adCopy', value: plan.adCopy },
      { name: 'cta', value: plan.cta },
    ];

    for (const field of topLevelFields) {
      if (!field.value) continue;
      const fieldWarnings = this.checkText(field.value, field.name);
      warnings.push(...fieldWarnings);
    }

    plan.scenes.forEach((scene, index) => {
      const sceneFields = [
        { name: 'visualDescription', value: scene.visualDescription },
        { name: 'subtitle', value: scene.subtitle },
        { name: 'voiceover', value: scene.voiceover },
        { name: 'seedancePrompt', value: scene.seedancePrompt },
      ];

      for (const field of sceneFields) {
        if (!field.value) continue;
        const fieldWarnings = this.checkText(field.value, `scenes[${index}].${field.name}`, index + 1);
        warnings.push(...fieldWarnings);
      }
    });

    return { complianceWarnings: warnings };
  }

  private checkText(text: string, field: string, position?: number): ComplianceWarning[] {
    const warnings: ComplianceWarning[] = [];
    // 记录已覆盖的字符区间，避免短词在长词命中范围内重复告警
    const coveredRanges: [number, number][] = [];

    for (const forbidden of SORTED_FORBIDDEN_WORDS) {
      // 检查是否所有出现位置都已被更长词覆盖
      let allCovered = true;
      let idx = -1;
      const word = forbidden.word;
      while ((idx = text.indexOf(word, idx + 1)) !== -1) {
        const end = idx + word.length;
        if (!coveredRanges.some(([s, e]) => s <= idx && end <= e)) {
          allCovered = false;
          break;
        }
      }
      if (allCovered) continue;

      // 检查首次出现即可 — 命中一次就应该告警
      idx = text.indexOf(word);
      if (idx === -1) continue;

      if (this.isSafeContext(text, forbidden)) continue;

      warnings.push({
        message: `字段"${field}"包含违规绝对化广告词"${forbidden.word}"`,
        field,
        position,
        suggestion: `建议替换为"${forbidden.suggestion}"等中性表达`,
        forbiddenWord: forbidden.word,
      });

      // 标记所有出现位置为已覆盖
      idx = -1;
      while ((idx = text.indexOf(word, idx + 1)) !== -1) {
        coveredRanges.push([idx, idx + word.length]);
      }
    }

    return warnings;
  }

  // 检查违规词是否处于安全上下文（日常用语而非广告宣称）
  private isSafeContext(text: string, forbidden: { word: string; safeNext?: string[] }): boolean {
    if (!forbidden.safeNext || forbidden.safeNext.length === 0) return false;

    let idx = -1;
    const word = forbidden.word;
    while ((idx = text.indexOf(word, idx + 1)) !== -1) {
      const afterChar = text.substring(idx + word.length, idx + word.length + 1);
      if (!forbidden.safeNext.includes(afterChar)) {
        return false;
      }
    }

    return true;
  }
}

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

export class ComplianceAgent implements IComplianceAgent {
  async check(plan: CreativePlanDraft): Promise<{ complianceWarnings: ComplianceWarning[] }> {
    const warnings: ComplianceWarning[] = [];

    // 检查顶层字段
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

    // 检查分镜字段
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
    const seenWords = new Set<string>();

    for (const forbidden of FORBIDDEN_WORDS) {
      if (seenWords.has(forbidden.word)) continue;
      if (!text.includes(forbidden.word)) continue;

      // 跳过安全上下文：如"第一次"中的"第一"是日常用语而非绝对化广告词
      if (this.isSafeContext(text, forbidden)) continue;

      warnings.push({
        message: `字段"${field}"包含违规绝对化广告词"${forbidden.word}"`,
        field,
        position,
        suggestion: `建议替换为"${forbidden.suggestion}"等中性表达`,
        forbiddenWord: forbidden.word,
      });
      seenWords.add(forbidden.word);
    }

    return warnings;
  }

  // 检查违规词是否处于安全上下文（日常用语而非广告宣称）
  private isSafeContext(text: string, forbidden: { word: string; safeNext?: string[] }): boolean {
    if (!forbidden.safeNext || forbidden.safeNext.length === 0) return false;

    // 找到所有出现位置，检查是否每一处都被安全后缀跟随
    let idx = -1;
    const word = forbidden.word;
    while ((idx = text.indexOf(word, idx + 1)) !== -1) {
      const afterChar = text.substring(idx + word.length, idx + word.length + 1);
      if (!forbidden.safeNext.includes(afterChar)) {
        // 至少有一处不是安全上下文 — 触发告警
        return false;
      }
    }

    // 所有出现位置都被安全字符跟随 — 视为日常用语
    return true;
  }
}

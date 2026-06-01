import * as fs from 'fs';
import * as path from 'path';
import type { Material, MaterialRole, MaterialRoleAnalysis } from '@shared/types';

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const VALID_ROLES: MaterialRole[] = [
  'product_primary',
  'product_detail',
  'usage_scene',
  'packaging',
  'other',
];

const ROLE_DESCRIPTIONS: Record<MaterialRole, string> = {
  product_primary: '商品主图：展示商品全貌的核心图片，通常用于首帧',
  product_detail: '商品细节：展示商品局部、材质、做工等细节',
  usage_scene: '使用场景：展示商品在实际使用中的场景',
  packaging: '包装展示：展示商品包装、礼盒等',
  other: '其他：不属于以上分类的图片',
};

export class MaterialRoleAnalyzer {
  private config: LLMConfig | null;

  constructor() {
    const apiKey = process.env.REAL_LLM_API_KEY;
    this.config = apiKey ? {
      apiKey,
      baseUrl: (process.env.REAL_LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.REAL_LLM_MODEL || 'gpt-4o-mini',
    } : null;
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  async analyze(materials: Material[]): Promise<MaterialRoleAnalysis[]> {
    if (!this.config) {
      throw new Error('LLM not configured');
    }

    const imageMaterials = materials.filter((m) => m.type === 'image');
    if (imageMaterials.length === 0) return [];

    const imageParts = imageMaterials
      .map((m) => this.resolveImageUrl(m))
      .filter((url): url is string => Boolean(url));

    if (imageParts.length === 0) {
      throw new Error('No valid image URLs found');
    }

    const systemPrompt = `你是一个电商素材分析专家。分析以下商品图片，判断每张图片的角色分类。

分类标准：
${VALID_ROLES.map((r) => `- ${r}: ${ROLE_DESCRIPTIONS[r]}`).join('\n')}

必须返回严格 JSON 格式，不要包含任何其他文本。顶层必须是对象，analyses 字段为数组。
JSON schema:
{
  "analyses": [
    {
      "materialId": "素材ID",
      "role": "分类角色",
      "confidence": 0.0-1.0,
      "reason": "分类理由"
    }
  ]
}

注意：
- materialId 必须使用提供的素材 ID，不要编造
- role 必须是 ${VALID_ROLES.join('/')} 之一
- confidence 表示分类置信度，0.0-1.0
- reason 用中文描述分类依据
- 每张图片都必须有分类结果`;

    const userContent: Array<Record<string, unknown>> = [
      {
        type: 'text',
        text: `请分析以下 ${imageMaterials.length} 张商品图片的角色：\n${imageMaterials.map((m, i) => `${i + 1}. ID: ${m.id}, 标题: ${m.title}, 标签: [${m.tags.join(', ')}]`).join('\n')}`,
      },
      ...imageParts.map((url) => ({
        type: 'image_url',
        image_url: { url },
      })),
    ];

    const controller = new AbortController();
    const timeoutMs = Math.max(Number(process.env.REAL_LLM_TIMEOUT_MS) || 30_000, 1000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const content = this.extractContent(data);
    if (!content) {
      throw new Error('LLM response missing content');
    }

    return this.parseAndValidate(content, imageMaterials);
  }

  private resolveImageUrl(material: Material): string | null {
    if (material.publicUrl && this.isPublicHttpUrl(material.publicUrl)) {
      return material.publicUrl;
    }

    try {
      const fileUrl = material.fileUrl;
      if (!/^\/uploads\/[^/\\]+$/.test(fileUrl)) return null;

      const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
      const fileName = path.basename(fileUrl);
      const filePath = path.resolve(uploadDir, fileName);
      if (!filePath.startsWith(`${uploadDir}${path.sep}`)) return null;
      if (!fs.existsSync(filePath)) return null;

      const stats = fs.statSync(filePath);
      if (stats.size > 10 * 1024 * 1024) return null;

      const ext = path.extname(fileName).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      };
      const mime = mimeMap[ext] || 'image/jpeg';
      const buffer = fs.readFileSync(filePath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  private isPublicHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      if (
        hostname === 'localhost' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private extractContent(data: Record<string, unknown>): string | null {
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (choices && choices.length > 0) {
      const message = choices[0].message as Record<string, unknown> | undefined;
      if (message && typeof message.content === 'string') {
        return message.content;
      }
    }
    return null;
  }

  private parseAndValidate(content: string, materials: Material[]): MaterialRoleAnalysis[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('LLM response is not valid JSON');
    }

    // Doubao returns { code, result } where result may be a string or object
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if ('result' in obj) {
        const result = obj.result;
        if (typeof result === 'string') {
          try { parsed = JSON.parse(result); } catch { /* keep as-is */ }
        } else if (result && typeof result === 'object') {
          parsed = result;
        }
      }
    }

    const validIds = new Set(materials.map((m) => m.id));
    const root = parsed as Record<string, unknown>;
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(root.analyses)
        ? root.analyses
        : Array.isArray(root.result)
          ? root.result
          : null;
    if (!Array.isArray(items)) {
      throw new Error('LLM response is not an array');
    }

    const results: MaterialRoleAnalysis[] = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;

      if (typeof obj.materialId !== 'string' || !validIds.has(obj.materialId)) {
        console.warn(`[MaterialRoleAnalyzer] Rejecting fabricated materialId: ${obj.materialId}`);
        continue;
      }

      if (typeof obj.role !== 'string' || !VALID_ROLES.includes(obj.role as MaterialRole)) {
        console.warn(`[MaterialRoleAnalyzer] Invalid role ${obj.role} for material ${obj.materialId}, using 'other'`);
        obj.role = 'other';
      }

      const confidence = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.5;
      const reason = typeof obj.reason === 'string' ? obj.reason : 'AI 分类';

      results.push({
        materialId: obj.materialId,
        role: obj.role as MaterialRole,
        confidence,
        reason,
      });
    }

    return results;
  }
}

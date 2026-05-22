import { v4 as uuidv4 } from 'uuid';
import type { AiProvider, ScriptInput, CreativePlanDraft, SceneRegenerateInput, SceneDraft } from '@shared/types/ai-providers';
import type { Product, Material } from '@shared/types';

export class MockAiProvider implements AiProvider {
  async generateScript(input: ScriptInput): Promise<CreativePlanDraft> {
    const { product, materials, style = 'scenario', maxDuration = 15 } = input;

    // 根据商品类别返回对应样例
    if (product.category.includes('家电') || product.title.includes('榨汁杯')) {
      return this.generateJuicerPlan(product, materials, style, maxDuration);
    } else if (product.category.includes('收纳') || product.title.includes('收纳包')) {
      return this.generateTravelBagPlan(product, materials, style, maxDuration);
    }

    // 默认返回通用样例
    return this.generateDefaultPlan(product, materials, style, maxDuration);
  }

  async regenerateScene(input: SceneRegenerateInput): Promise<SceneDraft> {
    const { existingScene, modifyRequest } = input;

    return {
      ...existingScene,
      order: existingScene.order,
      visualDescription: modifyRequest ? `${existingScene.visualDescription} - ${modifyRequest}` : existingScene.visualDescription,
      seedancePrompt: modifyRequest ? `${existingScene.seedancePrompt}, ${modifyRequest}` : existingScene.seedancePrompt,
      warnings: [],
    };
  }

  // 便携榨汁杯创意方案
  private generateJuicerPlan(
    product: Product,
    materials: Material[],
    style: string,
    maxDuration: number
  ): CreativePlanDraft {
    const imageMaterials = materials.filter(m => m.type === 'image');
    const videoMaterials = materials.filter(m => m.type === 'video');

    return {
      productId: product.id,
      style: style as any,
      title: `夏日鲜榨自由！${product.title}随身畅饮`,
      hook: '夏天想喝鲜榨果汁还要扛大榨汁机？',
      adCopy: `这款${product.title}只有水杯大小，30秒鲜榨，随身携带，${product.sellingPoints.join('，')}，随时享受新鲜健康！`,
      cta: '现在下单立享优惠，点击下方小黄车带走吧！',
      visualBible: {
        productAppearance: '白色简约便携榨汁杯，透明杯身，蓝色按钮',
        mainScenes: ['办公室桌面', '健身房', '户外野餐', '居家厨房'],
        colorTone: '明亮清新，夏日感，蓝白为主色调',
        continuityRules: ['商品外观保持一致', '场景切换自然', '色调统一明亮'],
        maxDuration: maxDuration,
      },
      scenes: [
        {
          order: 1,
          duration: 3,
          visualDescription: '女生满头大汗从健身房出来，拿出大瓶果汁拧不开，表情无奈',
          subtitle: '想喝鲜榨果汁太麻烦？',
          voiceover: '夏天健身想喝鲜榨果汁还要扛大榨汁机？太麻烦了！',
          seedancePrompt: '20岁女生在健身房休息区，满头大汗，拿着大瓶果汁拧瓶盖，表情无奈，明亮色调，真实场景，9:16竖屏',
          transition: 'cut',
          materialId: videoMaterials[0]?.id || imageMaterials[0]?.id,
          warnings: [],
        },
        {
          order: 2,
          duration: 4,
          visualDescription: '女生拿出便携榨汁杯，放入水果，按按钮30秒榨好果汁',
          subtitle: '30秒鲜榨，随身携带',
          voiceover: '直到我发现了这款便携榨汁杯，只有水杯大小，放入水果30秒就能榨出新鲜果汁',
          seedancePrompt: '女生拿出白色便携榨汁杯，放入切好的橙子和草莓，按蓝色按钮，榨汁过程特写，明亮清新色调，9:16竖屏',
          transition: 'fade',
          materialId: videoMaterials[1]?.id || imageMaterials[1]?.id,
          warnings: [],
        },
        {
          order: 3,
          duration: 4,
          visualDescription: '女生直接用榨汁杯喝果汁，露出满意笑容，展示产品细节',
          subtitle: '鲜榨果汁随时喝',
          voiceover: '榨好直接喝，不用换杯子，随身携带，上班健身都能用',
          seedancePrompt: '女生拿着榨汁杯喝果汁，露出开心的笑容，特写榨汁杯的细节，明亮色调，9:16竖屏',
          transition: 'fade',
          materialId: imageMaterials[2]?.id,
          warnings: [],
        },
        {
          order: 4,
          duration: 4,
          visualDescription: '产品展示，价格优惠信息，小黄车弹窗',
          subtitle: '现在下单立享优惠',
          voiceover: '现在下单还有优惠，点击下方小黄车带走吧！',
          seedancePrompt: '产品特写，旁边放着价格标签"限时优惠99元"，下方有购物车按钮，明亮清新色调，9:16竖屏',
          transition: 'zoom',
          materialId: imageMaterials[3]?.id || imageMaterials[0]?.id,
          warnings: [],
        },
      ],
      complianceWarnings: [],
      continuityWarnings: [],
    };
  }

  // 旅行收纳包创意方案
  private generateTravelBagPlan(
    product: Product,
    materials: Material[],
    style: string,
    maxDuration: number
  ): CreativePlanDraft {
    const imageMaterials = materials.filter(m => m.type === 'image');
    const videoMaterials = materials.filter(m => m.type === 'video');

    return {
      productId: product.id,
      style: style as any,
      title: `旅行收纳神器！${product.title}让行李箱空间翻倍`,
      hook: '旅行打包行李箱总是关不上？',
      adCopy: `这款${product.title}分类收纳，防水耐脏，让你的行李箱空间直接翻倍，${product.sellingPoints.join('，')}，出差旅行必备！`,
      cta: '现在下单享8折优惠，赶紧入手吧！',
      visualBible: {
        productAppearance: '灰色防水牛津布收纳包，多隔层设计，拉链款',
        mainScenes: ['居家卧室打包', '酒店行李箱整理', '出差出行'],
        colorTone: '干净整洁，商务简约，灰色调为主',
        continuityRules: ['产品外观保持一致', '收纳功能清晰展示', '色调统一整洁'],
        maxDuration: maxDuration,
      },
      scenes: [
        {
          order: 1,
          duration: 3,
          visualDescription: '女生蹲在行李箱前，衣服塞不下，行李箱关不上，表情烦躁',
          subtitle: '旅行打包总塞不下？',
          voiceover: '每次旅行打包，行李箱总是塞得满满当当还关不上？',
          seedancePrompt: '20多岁女生在卧室蹲在打开的行李箱前，衣服堆了一地，行李箱关不上，表情烦躁，干净明亮场景，9:16竖屏',
          transition: 'cut',
          materialId: videoMaterials[0]?.id || imageMaterials[0]?.id,
          warnings: [],
        },
        {
          order: 2,
          duration: 4,
          visualDescription: '女生拿出收纳包，分类放衣服、内衣、化妆品，整齐收纳',
          subtitle: '分类收纳，空间翻倍',
          voiceover: '直到我发现了这款旅行收纳包，多隔层设计，衣服、内衣、化妆品分类收纳，整洁又卫生',
          seedancePrompt: '女生拿出灰色收纳包，把衣服整齐叠好放进去，特写收纳包的隔层设计，干净整洁场景，9:16竖屏',
          transition: 'fade',
          materialId: videoMaterials[1]?.id || imageMaterials[1]?.id,
          warnings: [],
        },
        {
          order: 3,
          duration: 4,
          visualDescription: '收纳好的包整齐放进行李箱，还有很多空余空间，女生露出满意表情',
          subtitle: '行李箱空间直接翻倍',
          voiceover: '全部放好之后整齐放进行李箱，原来塞不下的现在还有空余空间，行李箱直接省出一半空间',
          seedancePrompt: '整齐的收纳包放进行李箱，还有很多空余空间，女生露出满意的笑容，干净明亮场景，9:16竖屏',
          transition: 'fade',
          materialId: imageMaterials[2]?.id,
          warnings: [],
        },
        {
          order: 4,
          duration: 4,
          visualDescription: '产品展示，8折优惠信息，购物车弹窗',
          subtitle: '现在下单享8折优惠',
          voiceover: '现在下单还有8折优惠，出差旅行必备，赶紧入手吧！',
          seedancePrompt: '收纳包产品特写，旁边有"8折优惠"字样，下方有购物车按钮，干净整洁风格，9:16竖屏',
          transition: 'zoom',
          materialId: imageMaterials[3]?.id || imageMaterials[0]?.id,
          warnings: [],
        },
      ],
      complianceWarnings: [],
      continuityWarnings: [],
    };
  }

  // 通用创意方案
  private generateDefaultPlan(
    product: Product,
    materials: Material[],
    style: string,
    maxDuration: number
  ): CreativePlanDraft {
    const imageMaterials = materials.filter(m => m.type === 'image');
    const videoMaterials = materials.filter(m => m.type === 'video');

    return {
      productId: product.id,
      style: style as any,
      title: `${product.title} - 你的生活好帮手`,
      hook: `你是不是还在为${product.usageScene}烦恼？`,
      adCopy: `这款${product.title}，${product.sellingPoints.join('，')}，专为${product.targetAudience}设计，让你的生活更便捷！`,
      cta: '现在下单享专属优惠，不要错过哦！',
      visualBible: {
        productAppearance: `简约现代设计的${product.title}`,
        mainScenes: [product.usageScene, '居家使用', '户外使用'],
        colorTone: '明亮简洁，符合产品调性',
        continuityRules: ['产品展示清晰', '场景自然', '色调统一'],
        maxDuration: maxDuration,
      },
      scenes: [
        {
          order: 1,
          duration: 3,
          visualDescription: `${product.targetAudience}在${product.usageScene}遇到麻烦，表情困扰`,
          subtitle: `你是不是也有这样的烦恼？`,
          voiceover: `你是不是还在为${product.usageScene}烦恼？`,
          seedancePrompt: `${product.targetAudience}在${product.usageScene}遇到麻烦，表情困扰，真实场景，9:16竖屏`,
          transition: 'cut',
          materialId: imageMaterials[0]?.id,
          warnings: [],
        },
        {
          order: 2,
          duration: 4,
          visualDescription: `用户使用${product.title}，轻松解决问题`,
          subtitle: `轻松解决你的烦恼`,
          voiceover: `直到我发现了这款${product.title}，${product.sellingPoints[0]}，使用起来特别方便`,
          seedancePrompt: `用户使用${product.title}，轻松解决问题，露出满意表情，9:16竖屏`,
          transition: 'fade',
          materialId: videoMaterials[0]?.id || imageMaterials[1]?.id,
          warnings: [],
        },
        {
          order: 3,
          duration: 4,
          visualDescription: `产品功能细节展示，突出核心卖点`,
          subtitle: `${product.sellingPoints.join('，')}`,
          voiceover: `${product.sellingPoints.slice(1).join('，')}，特别适合${product.targetAudience}使用`,
          seedancePrompt: `${product.title}功能细节特写，清晰展示核心卖点，明亮简洁风格，9:16竖屏`,
          transition: 'fade',
          materialId: imageMaterials[2]?.id,
          warnings: [],
        },
        {
          order: 4,
          duration: 4,
          visualDescription: `产品展示，优惠信息，购物引导`,
          subtitle: `现在下单享专属优惠`,
          voiceover: `现在下单还有专属优惠，不要错过哦！`,
          seedancePrompt: `${product.title}产品展示，旁边有优惠信息，下方有购物车按钮，9:16竖屏`,
          transition: 'zoom',
          materialId: imageMaterials[3]?.id || imageMaterials[0]?.id,
          warnings: [],
        },
      ],
      complianceWarnings: [],
      continuityWarnings: [],
    };
  }
}

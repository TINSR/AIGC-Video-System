# Day 5 澶?Agent 缂栨帓鏀硅繘鏂规

> 寤鸿鎵ц鏃舵満锛欴ay 4 鍒嗛暅鍓緫鍙板畬鎴愬苟閫氳繃鑱旇皟涔嬪悗
> 鏀硅繘鑼冨洿锛氫富瑕佷慨鏀?AI/CreativePlan 鐢熸垚妯″潡
> 鏍稿績鍘熷垯锛氫繚鎸佺幇鏈?API 璺緞鍜?`CreativePlan` 杩斿洖缁撴瀯鍩烘湰涓嶅彉锛屽厛鍋氬唴閮?pipeline锛屼笉鎺ㄧ炕鍓嶅悗绔灦鏋勩€?
---

## 1. 涓轰粈涔?Day 5 鍋氬 Agent

Day 4 鐨勯噸鐐规槸锛?
```text
鍒嗛暅鍓緫鍙?scene 椤哄簭/鏃堕暱/杞満/瀛楀箷/prompt 缂栬緫
render 鎸夌敤鎴风紪杈戝悗鐨?scenes 鎵ц
```

杩欎簺鍔熻兘瀹屾垚鍚庯紝绯荤粺浼氳繘鍏ユ洿寮虹殑鈥滃垎闀滈┍鍔ㄢ€濇ā寮忋€?
濡傛灉鍚庣画瑕佹敮鎸侊細

```text
鍗曞垎闀滈瑙?鍗曞垎闀滈噸鐢熸垚
澶氬垎闀滃垎鍒敓鎴?FFmpeg 鎷兼帴
```

閭ｄ箞鍓嶉潰鐨勫墽鏈€佸垎闀溿€乸rompt 蹇呴』鏇寸ǔ瀹氥€傚惁鍒欐瘡涓?scene 鍗曠嫭鐢熸垚鏃讹紝鍟嗗搧澶栬銆侀鏍笺€佽浆鍦恒€佸崠鐐归『搴忛兘浼氬彉寰椾笉涓€鑷淬€?
鎵€浠?Day 5 瑕佹敼杩涳細

```text
CreativePlan 鐢熸垚閫昏緫
```

浠庯細

```text
MockAiProvider 涓€娆＄敓鎴?CreativePlan
-> ComplianceAgent 妫€鏌?-> ContinuityAgent 妫€鏌?```

鍗囩骇涓猴細

```text
CreativePlanPipeline
-> 澶?Agent 鍒嗛樁娈电敓鎴愬拰瀹℃煡
-> 杩斿洖缁撴瀯鍖?CreativePlan
```

---

## 2. 瀵瑰墠鍚庣鏋舵瀯鐨勫奖鍝?
褰卞搷涓嶅ぇ銆?
淇濇寔涓嶅彉锛?
```text
POST /api/products/:productId/creative-plans/generate
GET /api/creative-plans/:id
PUT /api/creative-plans/:id/scenes/:sceneId
POST /api/creative-plans/:id/approve
POST /api/creative-plans/:id/render
```

鍓嶇浠嶇劧鎷垮埌锛?
```text
CreativePlan
```

鍚庣璺敱浠嶇劧璋冪敤锛?
```text
creativePlanService.generate(...)
```

涓昏鍙樺寲鍙戠敓鍦?service 鍐呴儴锛?
```text
鍘熸潵锛歁ockAiProvider.generateCreativePlan()
鏀逛负锛欳reativePlanPipeline.run()
```

---

## 3. 澶?Agent 缂栨帓鐩爣

鐩爣涓嶆槸鍋氬鏉傝嚜涓?Agent 绯荤粺锛岃€屾槸鍋?*纭畾鎬ф祦姘寸嚎**銆?
姣忎釜 Agent 鑱岃矗鏄庣‘锛岃緭鍏ヨ緭鍑烘竻妤氾紝鏈€澶氫慨璁?1-2 杞紝閬垮厤鏃犻檺寰幆銆?
鎺ㄨ崘娴佺▼锛?
```text
1. Product Analyst Agent
2. Creative Strategy Agent
3. Visual Bible Agent
4. Script Agent
5. Storyboard Agent
6. Seedance Prompt Agent
7. Compliance Agent
8. Continuity Agent
9. Revision Agent
10. User Review
```

---

## 4. Agent 鑱岃矗瀹氫箟

### 1. Product Analyst Agent

鑱岃矗锛?
- 鐞嗚В鍟嗗搧鍚嶇О銆佸搧绫汇€佸崠鐐广€佷环鏍煎尯闂淬€?- 鐞嗚В鐩爣鐢ㄦ埛銆?- 鍒嗘瀽绱犳潗绫诲瀷鍜屽彲鐢ㄧ礌鏉愩€?- 杈撳嚭鍟嗗搧 brief銆?
杈撳嚭绀轰緥锛?
```ts
type ProductBrief = {
  productName: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  materialSummary: string[];
  constraints: string[];
};
```

---

### 2. Creative Strategy Agent

鑱岃矗锛?
- 瀹氫箟瑙嗛鐩爣銆?- 纭畾鍗栫偣椤哄簭銆?- 纭畾鎯呯华鑺傚銆?- 鍐冲畾 4 涓垎闀滅殑鍔熻兘鍒嗗伐銆?
鎺ㄨ崘鍒嗛暅缁撴瀯锛?
```text
Scene 1: hook锛屽紩鍙戝叴瓒?Scene 2: feature锛屽睍绀烘牳蹇冨姛鑳?Scene 3: proof锛屽睍绀轰娇鐢ㄥ満鏅?鏁堟灉
Scene 4: cta锛屼績鍗曡浆鍖?```

杈撳嚭绀轰緥锛?
```ts
type CreativeStrategy = {
  videoGoal: string;
  audiencePainPoint: string;
  sellingPointOrder: string[];
  emotionalArc: string;
  sceneGoals: Array<"hook" | "feature" | "proof" | "cta">;
};
```

---

### 3. Visual Bible Agent

鑱岃矗锛?
- 鍥哄畾鍏ㄥ眬瑙嗚璁惧畾銆?- 淇濊瘉澶氬垎闀滅敓鎴愭椂鍟嗗搧澶栬涓€鑷淬€?- 瑙勫畾绂佹浜嬮」銆?
杈撳嚭娌跨敤鐜版湁 `VisualBible`锛?
```ts
type VisualBible = {
  aspectRatio: string;
  style: string;
  colorTone: string;
  lighting: string;
  cameraStyle: string;
  productAppearance: string;
  mainScenes: string[];
  continuityRules: string[];
};
```

鍏抽敭瑕佹眰锛?
```text
VisualBible 蹇呴』娉ㄥ叆姣忎竴涓?scene.seedancePrompt銆?```

---

### 4. Script Agent

鑱岃矗锛?
- 鐢熸垚 `title`銆?- 鐢熸垚 `hook`銆?- 鐢熸垚 `adCopy`銆?- 鐢熸垚 `cta`銆?- 缁熶竴鏃佺櫧椋庢牸銆?
瑕佹眰锛?
- 閬垮厤骞垮憡娉曠粷瀵瑰寲璇嶃€?- 鏂囨鐭紝閫傚悎 15 绉掔煭瑙嗛銆?- CTA 涓嶈兘澶稿紶鎵胯銆?
---

### 5. Storyboard Agent

鑱岃矗锛?
- 鎷嗗垎 4 涓?scenes銆?- 姣忎釜 scene 鏈夋槑纭洰鏍囥€?- 姣忎釜 scene 鏈夌敾闈㈡弿杩般€佸瓧骞曘€佹梺鐧姐€佹椂闀裤€佽浆鍦恒€?
鎺ㄨ崘 scene 鍐呴儴閫昏緫锛?
```ts
type ScenePlan = {
  goal: "hook" | "feature" | "proof" | "cta";
  duration: number;
  visualDescription: string;
  subtitle: string;
  voiceover: string;
  transition: string;
  continuityAnchor: string;
};
```

---

### 6. Seedance Prompt Agent

鑱岃矗锛?
- 鎶婃瘡涓?scene 杞垚 Seedance prompt銆?- 姣忎釜 prompt 閮芥敞鍏?`VisualBible`銆?- 鐢熸垚閫傚悎鏂囩敓瑙嗛鎴栧浘鐢熻棰戠殑鎻愮ず璇嶃€?
姣忎釜 prompt 缁撴瀯寤鸿锛?
```text
GLOBAL VISUAL BIBLE:
- Aspect ratio:
- Product appearance:
- Style:
- Color tone:
- Lighting:
- Camera style:
- Continuity rules:

CURRENT SCENE:
- Goal:
- Duration:
- Visual:
- Subtitle:
- Voiceover:
- Transition:

MUST FOLLOW:
- Keep the product appearance identical across scenes.
- Do not change product color, shape, or size.
- Keep a 9:16 ecommerce short-video style.
- Avoid exaggerated advertising claims.
```

---

### 7. Compliance Agent

鑱岃矗锛?
- 妫€鏌ュ箍鍛婃硶椋庨櫓璇嶃€?- 妫€鏌ュじ寮犳壙璇恒€?- 妫€鏌ュ尰鐤椼€佸姛鏁堛€佹瀬闄愯瘝椋庨櫓銆?
褰撳墠宸叉湁 `ComplianceAgent`锛孌ay 5 鍙互缁х画澶嶇敤銆?
杈撳嚭锛?
```ts
type ComplianceWarning = {
  field: string;
  keyword: string;
  message: string;
  severity: "low" | "medium" | "high";
};
```

---

### 8. Continuity Agent

鑱岃矗锛?
- 妫€鏌ュ垎闀滀箣闂存槸鍚﹀啿绐併€?- 妫€鏌?VisualBible 鏄惁瀹屾暣銆?- 妫€鏌?scene 鏄惁閮介伒瀹堢粺涓€鍟嗗搧澶栬銆?- 妫€鏌ユ€绘椂闀垮拰鍗曟鏃堕暱銆?- 妫€鏌ヨ浆鍦烘槸鍚︾己澶便€?
褰撳墠宸叉湁 `ContinuityAgent`锛孌ay 5 鍙互澧炲己涓烘洿璇箟鍖栥€?
---

### 9. Revision Agent

鑱岃矗锛?
- 鏍规嵁 Compliance/Continuity warnings 淇鑽夌銆?- 鏈€澶氫慨璁?1-2 杞€?- 淇鍚庡啀娆℃鏌ャ€?
瑙勫垯锛?
```text
鍙慨姝ｅ彲鑷姩淇鐨勯棶棰樸€?楂橀闄╀笉纭畾鍐呭淇濈暀 warning锛屼氦缁欑敤鎴峰鏍搞€?涓嶈嚜鍔ㄥ垹闄ょ敤鎴锋彁渚涚殑鏍稿績鍗栫偣銆?```

---

### 10. User Review

鑱岃矗锛?
- 鍓嶇灞曠ず CreativePlan銆?- 鐢ㄦ埛瀹℃牳骞垮憡璇嶃€佸垎闀溿€乸rompt銆亀arnings銆?- 鐢ㄦ埛鍙互缂栬緫鍚?approve銆?
娉ㄦ剰锛?
```text
User Review 浠嶇劧鏄渶缁堢‘璁ょ幆鑺傘€?AI 涓嶈兘缁曡繃鐢ㄦ埛鐩存帴鐢熸垚瑙嗛銆?```

---

## 5. Day 5 鎺ㄨ崘瀹炵幇鏂瑰紡

涓嶈涓€寮€濮嬪仛鎴愬鏉?Agent 妗嗘灦銆?
寤鸿鍏堝疄鐜帮細

```text
apps/api/src/modules/creative-plans/CreativePlanPipeline.ts
```

鍐呴儴鐢ㄦ槑纭嚱鏁帮細

```ts
class CreativePlanPipeline {
  async run(input: CreativePlanInput): Promise<CreativePlanDraft> {
    const productBrief = await this.productAnalyst.run(input);
    const strategy = await this.strategyAgent.run(productBrief);
    const visualBible = await this.visualBibleAgent.run(productBrief, strategy);
    const script = await this.scriptAgent.run(productBrief, strategy);
    const storyboard = await this.storyboardAgent.run(productBrief, strategy, visualBible, script);
    const promptedScenes = await this.seedancePromptAgent.run(storyboard, visualBible);
    const complianceWarnings = await this.complianceAgent.check(script, promptedScenes);
    const continuityWarnings = await this.continuityAgent.check(visualBible, promptedScenes);
    const revised = await this.revisionAgent.reviseOnceIfNeeded(...);
    return this.toCreativePlanDraft(revised);
  }
}
```

濡傛灉鏆傛椂娌℃湁鐪熷疄 LLM锛屽彲浠ュ厛鐢ㄨ鍒欏拰妯℃澘瀹炵幇銆?
---

## 6. P0/P1/P2 鑼冨洿

### P0锛氬繀椤诲畬鎴?
- 鏂板 `CreativePlanPipeline`銆?- 淇濇寔 `POST /creative-plans/generate` 杩斿洖缁撴瀯涓嶅彉銆?- 鎶婄幇鏈?MockAiProvider 鎺ュ叆 pipeline锛屾垨璁?pipeline 鍖呰 MockAiProvider銆?- 纭繚 `visualBible` 娉ㄥ叆姣忎釜 `scene.seedancePrompt`銆?- ComplianceAgent 鍜?ContinuityAgent 缁х画杩愯銆?- build 閫氳繃銆?- 鍘熸湁 generate -> approve -> render 閾捐矾涓嶅潖銆?
### P1锛氬缓璁畬鎴?
- 鎷嗗嚭 Product Analyst / Strategy / VisualBible / Storyboard / Prompt agent 鏂囦欢銆?- scene 鍐呴儴澧炲姞 `goal`銆乣continuityAnchor` 绛夊唴閮ㄥ瓧娈碉紝鎴栧啓鍏?prompt銆?- RevisionAgent 鍋氫竴杞嚜鍔ㄤ慨姝ｃ€?- 杈撳嚭 agent trace锛屾柟渚垮墠绔垨鏃ュ織灞曠ず銆?
### P2锛氬悗缁畬鎴?
- 姣忎釜 Agent 鎺ョ湡瀹?LLM銆?- 澶氳疆瀹℃煡涓庝慨璁€?- 鍒嗛暅绾х敓鎴愭椂浣跨敤 scene-specific prompt銆?- 鍓嶇灞曠ず agent trace銆?
---

## 7. 瀵瑰叡浜被鍨嬬殑寤鸿

Day 5 涓嶅己鍒舵敼鍏变韩绫诲瀷銆?
濡傛灉瑕佸姞瀛楁锛屽缓璁皑鎱庢柊澧烇細

```ts
type Scene = {
  goal?: "hook" | "feature" | "proof" | "cta";
  continuityAnchor?: string;
  negativePrompt?: string;
};
```

濡傛灉鎷呭績褰卞搷鍓嶇锛屽彲浠ュ厛涓嶅姞瀛楁锛屾妸杩欎簺鍐呭鍐欏叆锛?
```text
scene.visualDescription
scene.seedancePrompt
scene.warnings
```

---

## 8. 楠屾敹鏍囧噯

- [ ] API 璺緞涓嶅彉銆?- [ ] CreativePlan 杩斿洖缁撴瀯鍩烘湰涓嶅彉銆?- [ ] `visualBible` 琚敞鍏ユ瘡涓?`scene.seedancePrompt`銆?- [ ] 姣忎釜 scene 鏈夋槑纭姛鑳斤細hook / feature / proof / cta銆?- [ ] Compliance warnings 浠嶅彲鐢ㄣ€?- [ ] Continuity warnings 浠嶅彲鐢ㄣ€?- [ ] generate -> approve -> render 涓嶅潖銆?- [ ] Seedance/fallback 涓嶅潖銆?- [ ] build 閫氳繃銆?
---

## 9. 缁?AI Coding Agent 鐨勬彁绀鸿瘝

```text
浣犳槸 Day 5 AI/CreativePlan Agent銆?褰撳墠 Day 4 瀹屾垚鍚庯紝椤圭洰宸茬粡鏈夊垎闀滃壀杈戝彴鍜岀湡瀹?Seedance 鏈€灏忛摼璺€?浣犵殑浠诲姟鏄崌绾?CreativePlan 鐢熸垚閫昏緫涓哄 Agent Pipeline锛屼絾淇濇寔鐜版湁 API 鍜?CreativePlan 杩斿洖缁撴瀯鍩烘湰涓嶅彉銆?
璇峰疄鐜帮細
1. 鏂板 CreativePlanPipeline锛?2. 灏?Product Analyst銆丆reative Strategy銆乂isual Bible銆丼cript銆丼toryboard銆丼eedance Prompt銆丆ompliance銆丆ontinuity銆丷evision 浣滀负鍐呴儴娴佹按绾块樁娈碉紱
3. 鏆傛椂鍙互鐢ㄨ鍒?妯℃澘瀹炵幇锛屼笉瑕佹眰姣忎釜 Agent 閮芥帴鐪熷疄 LLM锛?4. 姣忎釜 scene 蹇呴』鏈夋槑纭洰鏍囷細hook / feature / proof / cta锛?5. visualBible 蹇呴』娉ㄥ叆姣忎釜 scene.seedancePrompt锛?6. ComplianceAgent 鍜?ContinuityAgent 缁х画杩愯锛?7. 濡傛湁 warnings锛孯evisionAgent 鏈€澶氫慨璁?1 杞紱
8. 淇濇寔 POST /api/products/:productId/creative-plans/generate 涓嶅彉锛?9. 淇濇寔 generate -> approve -> render 閾捐矾涓嶅潖锛?10. 涓嶆彁浜?API Key銆?
瀹屾垚鍚庤緭鍑烘敼鍔ㄦ枃浠躲€乥uild 缁撴灉銆佺敓鎴愭牱渚嬨€亀arnings 鏍蜂緥銆佷粛闇€鍚庣画鎺ョ湡瀹?LLM 鐨勪綅缃€?```

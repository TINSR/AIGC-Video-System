# Agent C Day 5 浠诲姟涔︼細CreativePlan 澶?Agent Pipeline

> 瑙掕壊锛欰I/CreativePlan Agent
> 寤鸿鍒嗘敮锛歚feature/day5-multi-agent-pipeline`
> 鐩爣锛氭妸 CreativePlan 鐢熸垚閫昏緫鍗囩骇涓哄彲瑙ｉ噴銆佸彲鎵╁睍鐨勫 Agent 娴佹按绾匡紝涓哄垎闀滃垎鍒敓鎴愭墦鍩虹銆?
---

## 1. 浠诲姟鑳屾櫙

褰撳墠绯荤粺宸茬粡鑳斤細

- 鐢熸垚 CreativePlan銆?- 鐢ㄦ埛瀹℃牳鍜岀紪杈戝垎闀溿€?- 璋冪敤 Seedance 鐢熸垚瑙嗛銆?- 鏃?Key 鎴栧け璐ユ椂 FFmpeg fallback銆?
浣嗗鏋滃悗缁鍋氾細

- 鍗曞垎闀滈瑙堛€?- 鍗曞垎闀滈噸鐢熸垚銆?- 澶氬垎闀滃垎鍒敓鎴愩€?- FFmpeg 鎷兼帴鏈€缁堣棰戙€?
灏遍渶瑕佹洿鍙潬鐨勫墠缃墽鏈笌鍒嗛暅鐢熸垚銆?
---

## 2. P0 浠诲姟

蹇呴』瀹屾垚锛?
- 鏂板 `CreativePlanPipeline`銆?- 淇濇寔鐜版湁 generate API 涓嶅彉銆?- 淇濇寔 CreativePlan 杩斿洖缁撴瀯鍩烘湰涓嶅彉銆?- 浣跨敤澶氶樁娈?pipeline 鏇夸唬鈥滀竴娆℃€х敓鎴愨€濄€?- 姣忎釜 scene 蹇呴』鏈夋槑纭洰鏍囷細

```text
Scene 1: hook
Scene 2: feature
Scene 3: proof
Scene 4: cta
```

- 姣忎釜 `scene.seedancePrompt` 蹇呴』鍖呭惈鍚屼竴浠?`visualBible`銆?- 缁х画杩愯 `ComplianceAgent`銆?- 缁х画杩愯 `ContinuityAgent`銆?- 鍘熸湁 render 閾捐矾涓嶅潖銆?
---

## 3. 鎺ㄨ崘鏂囦欢缁撴瀯

鍙互鏂板锛?
```text
apps/api/src/modules/creative-plans/CreativePlanPipeline.ts
apps/api/src/agents/ProductAnalystAgent.ts
apps/api/src/agents/CreativeStrategyAgent.ts
apps/api/src/agents/VisualBibleAgent.ts
apps/api/src/agents/ScriptAgent.ts
apps/api/src/agents/StoryboardAgent.ts
apps/api/src/agents/SeedancePromptAgent.ts
apps/api/src/agents/RevisionAgent.ts
```

宸叉湁锛?
```text
apps/api/src/agents/ComplianceAgent.ts
apps/api/src/agents/ContinuityAgent.ts
```

鍙互缁х画澶嶇敤銆?
---

## 4. P1 浠诲姟

寤鸿瀹屾垚锛?
- agent trace 鏃ュ織銆?- RevisionAgent 鏍规嵁 warnings 淇 1 杞€?- ContinuityAgent 妫€鏌?scene goal 鏄惁瀹屾暣銆?- PromptAgent 鐢熸垚 negative prompt 鎴栫姝簨椤广€?- 鏂囨。璇存槑澶?Agent 娴佺▼銆?
---

## 5. 绂佹浜嬮」

- 涓嶈鏀?API 璺緞銆?- 涓嶈瑕佹眰鍓嶇閲嶅啓銆?- 涓嶈鎻愪氦鐪熷疄 API Key銆?- 涓嶈涓轰簡 agent 鎷嗗垎鐮村潖鐜版湁 Mock/Seedance/fallback銆?- 涓嶈鏃犻檺寰幆 revision銆?
---

## 6. 楠屾敹鏍囧噯

- [ ] `npm --prefix apps/api run build` 閫氳繃銆?- [ ] `POST /api/products/:productId/creative-plans/generate` 鍙敤銆?- [ ] 杩斿洖 CreativePlan 鍖呭惈 4 涓?scenes銆?- [ ] scenes 鐩爣椤哄簭娓呮锛歨ook/feature/proof/cta銆?- [ ] 姣忎釜 `seedancePrompt` 鍖呭惈 visualBible銆?- [ ] Compliance warnings 鍙敤銆?- [ ] Continuity warnings 鍙敤銆?- [ ] approve/render 浠嶅彲鐢ㄣ€?- [ ] Seedance/fallback 浠嶅彲鐢ㄣ€?

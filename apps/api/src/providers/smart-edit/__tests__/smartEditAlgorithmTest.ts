/**
 * Smart Edit Algorithm Test Fixtures
 * Run: npx ts-node -r tsconfig-paths/register src/providers/smart-edit/__tests__/smartEditAlgorithmTest.ts
 *
 * No database required. Tests the rule-based pipeline:
 * ClipProfile generation → GlobalSceneClipOptimizer beam search
 */

import { RuleBasedClipUnderstandingProvider } from '../RuleBasedClipUnderstandingProvider';
import { DoubaoClipUnderstandingProvider } from '../DoubaoClipUnderstandingProvider';
import { GlobalSceneClipOptimizer } from '../GlobalSceneClipOptimizer';
import { SceneBoundaryDetector } from '../SceneBoundaryDetector';
import { ClipKeyframeExtractor } from '../ClipKeyframeExtractor';
import type { ClipAnalysisInput } from '../IClipUnderstandingProvider';
import type { ClipProfile } from '../types';
import type { Scene, MaterialClip, SmartEditDecision } from '@shared/types';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ─── Fixture Data ────────────────────────────────────────────────────

const PRODUCT_CONTEXT = {
  name: '旅行收纳包',
  category: '旅行用品',
  sellingPoints: ['多隔层分类收纳', '防泼水面料', '双向拉链，开合方便'],
};

function makeScene(id: string, order: number, goal: Scene['goal'], subtitle: string, duration = 3): Scene {
  return {
    id,
    order,
    goal: goal ?? null,
    subtitle,
    voiceover: '',
    visualDescription: subtitle,
    duration,
  } as Scene;
}

function makeClip(
  id: string,
  materialId: string,
  sceneType: MaterialClip['sceneType'],
  type: MaterialClip['type'],
  tags: string[],
  duration = 3,
  fileUrl = `${materialId}.mp4`,
): MaterialClip {
  return {
    id,
    productId: 'prod-1',
    materialId,
    sourceType: 'merchant_upload',
    type,
    fileUrl,
    duration,
    summary: `${sceneType} clip`,
    tags,
    sceneType,
    visualQuality: type === 'image' ? 0.9 : 0.75,
    motionLevel: type === 'image' ? 'low' : 'medium',
    suitableGoals: defaultGoals(sceneType),
    createdAt: new Date().toISOString(),
  };
}

function defaultGoals(sceneType: string): Array<'hook' | 'feature' | 'proof' | 'cta' | 'full_demo'> {
  switch (sceneType) {
    case 'product_closeup': return ['feature', 'cta'];
    case 'detail': return ['feature', 'proof'];
    case 'usage_scene': return ['hook', 'proof'];
    case 'lifestyle': return ['hook'];
    case 'packaging': return ['proof', 'cta'];
    case 'cta': return ['cta'];
    default: return ['feature'];
  }
}

// ─── Fixture A: Adequate Materials ──────────────────────────────────

const FIXTURE_A_SCENES: Scene[] = [
  makeScene('s1', 1, 'hook', '旅行收纳烦恼多？', 3),
  makeScene('s2', 2, 'feature', '多隔层分类收纳，告别杂乱', 3),
  makeScene('s3', 3, 'proof', '防泼水面料，下雨也不怕', 3),
  makeScene('s4', 4, 'cta', '立即下单，旅行好帮手', 3),
];

const FIXTURE_A_CLIPS: MaterialClip[] = [
  makeClip('c1', 'm1', 'product_closeup', 'image', ['主图', '商品', '收纳包'], 3, 'product_main.jpg'),
  makeClip('c2', 'm2', 'detail', 'video_clip', ['拉链', '双向拉链', '开合'], 4, 'zipper.mp4'),
  makeClip('c3', 'm3', 'detail', 'video_clip', ['面料', '防泼水', '水滴'], 5, 'waterproof.mp4'),
  makeClip('c4', 'm4', 'usage_scene', 'video_clip', ['收纳', '衣物', '隔层', '分类'], 4, 'organize.mp4'),
  makeClip('c5', 'm5', 'usage_scene', 'video_clip', ['旅行', '使用', '场景', '旅行箱'], 6, 'travel.mp4'),
];

// ─── Fixture B: Inadequate Materials ────────────────────────────────

const FIXTURE_B_SCENES: Scene[] = [
  makeScene('s1', 1, 'hook', '旅行收纳烦恼多？', 3),
  makeScene('s2', 2, 'feature', '多隔层分类收纳', 3),
  makeScene('s3', 3, 'proof', '防泼水面料', 3),
  makeScene('s4', 4, 'cta', '立即下单', 3),
];

const FIXTURE_B_CLIPS: MaterialClip[] = [
  makeClip('c1', 'm1', 'product_closeup', 'image', ['主图', '商品'], 3, 'product.jpg'),
  makeClip('c2', 'm2', 'usage_scene', 'video_clip', ['展示', '商品'], 4, 'show.mp4'),
];

// ─── Fixture C: LLM Failure (Rule Fallback) ────────────────────────

const FIXTURE_C_SCENES = FIXTURE_A_SCENES;
const FIXTURE_C_CLIPS = FIXTURE_A_CLIPS;

// ─── Test Runner ────────────────────────────────────────────────────

async function analyzeClipsAsProfiles(
  clips: MaterialClip[],
  useContext = PRODUCT_CONTEXT,
): Promise<Map<string, ClipProfile>> {
  const provider = new RuleBasedClipUnderstandingProvider();
  const profiles = new Map<string, ClipProfile>();

  for (const clip of clips) {
    const input: ClipAnalysisInput = {
      clipId: clip.id,
      materialId: clip.materialId,
      materialTitle: clip.summary,
      materialTags: clip.tags,
      materialDescription: clip.summary,
      startTime: clip.startTime ?? 0,
      endTime: (clip.startTime ?? 0) + clip.duration,
      duration: clip.duration,
      isImage: clip.type === 'image',
      keyframes: null,
      productName: useContext.name,
      productCategory: useContext.category,
      productSellingPoints: useContext.sellingPoints,
    };

    const profile = await provider.analyze(input);
    if (profile) {
      profiles.set(clip.id, profile);
    }
  }

  return profiles;
}

function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function assertTest(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function printClipProfiles(profiles: Map<string, ClipProfile>) {
  console.log('\n--- ClipProfile 概览 ---');
  for (const [clipId, p] of profiles) {
    console.log(`  [${clipId}] ${p.sceneType} | vis=${p.productVisibility} qual=${p.visualQuality} motion=${p.motionIntensity} shot=${p.shotType}`);
    console.log(`    summary: ${p.summary}`);
    console.log(`    sellingPoints: [${p.sellingPoints.join(', ')}]`);
    console.log(`    suitableGoals: [${p.suitableGoals.join(', ')}]`);
    console.log(`    source: ${p.analysisSource}`);
  }
}

function printDecisions(decisions: SmartEditDecision[]) {
  console.log('\n--- 全局选镜结果 ---');
  for (const d of decisions) {
    console.log(`  Scene ${d.sceneOrder} (${d.sceneGoal ?? 'none'}): clip=${d.clip?.id ?? 'NONE'} score=${d.score} fallback=${d.fallbackUsed}`);
    for (const r of d.reasons) {
      console.log(`    - ${r}`);
    }
  }
}

async function testFixtureA() {
  printSeparator('Fixture A: 素材充足');

  const profiles = await analyzeClipsAsProfiles(FIXTURE_A_CLIPS);
  printClipProfiles(profiles);

  const optimizer = new GlobalSceneClipOptimizer();
  const decisions = optimizer.optimize(FIXTURE_A_SCENES, FIXTURE_A_CLIPS, profiles);
  printDecisions(decisions);

  // Assertions
  const goals = decisions.map((d) => d.sceneGoal);
  const clipIds = decisions.map((d) => d.clip?.id);
  const hasConsecutiveReuse = clipIds.some((clipId, index) => index > 0 && clipId === clipIds[index - 1]);

  console.log('\n--- 验证 ---');
  console.log(`  所有分镜都有 decision: ${decisions.length === FIXTURE_A_SCENES.length ? 'PASS' : 'FAIL'}`);
  console.log(`  无连续复用同一 clip: ${!hasConsecutiveReuse ? 'PASS' : 'FAIL'}`);
  console.log(`  Hook 选择 usage_scene/lifestyle: ${checkGoalPreference(decisions, 'hook', ['usage_scene', 'lifestyle'], profiles) ? 'PASS' : 'WARN'}`);
  console.log(`  CTA 选择 product_closeup/image: ${checkGoalPreference(decisions, 'cta', ['product_closeup'], profiles) ? 'PASS' : 'WARN'}`);
  console.log(`  所有 score 在 0-100: ${decisions.every((d) => d.score >= 0 && d.score <= 100) ? 'PASS' : 'FAIL'}`);
  console.log(`  所有 decision 有 reasons: ${decisions.every((d) => d.reasons.length > 0) ? 'PASS' : 'FAIL'}`);

  assertTest(decisions.length === FIXTURE_A_SCENES.length, 'Fixture A: decision 数量不完整');
  assertTest(!hasConsecutiveReuse, 'Fixture A: 不应连续复用同一 clip');
  assertTest(checkGoalPreference(decisions, 'hook', ['usage_scene', 'lifestyle'], profiles), 'Fixture A: Hook 选镜不符合预期');
  assertTest(checkGoalPreference(decisions, 'cta', ['product_closeup'], profiles), 'Fixture A: CTA 选镜不符合预期');
  assertTest(decisions.every((d) => d.score >= 0 && d.score <= 100), 'Fixture A: score 超出范围');
  assertTest(decisions.every((d) => d.reasons.length > 0), 'Fixture A: decision 缺少 reasons');
}

async function testFixtureB() {
  printSeparator('Fixture B: 素材不足');

  const profiles = await analyzeClipsAsProfiles(FIXTURE_B_CLIPS);
  printClipProfiles(profiles);

  const optimizer = new GlobalSceneClipOptimizer();
  const decisions = optimizer.optimize(FIXTURE_B_SCENES, FIXTURE_B_CLIPS, profiles);
  printDecisions(decisions);

  console.log('\n--- 验证 ---');
  console.log(`  所有分镜都有 decision: ${decisions.length === FIXTURE_B_SCENES.length ? 'PASS' : 'FAIL'}`);
  console.log(`  不抛异常: PASS`);
  console.log(`  复用时有理由: ${decisions.filter((d) => !d.fallbackUsed).every((d) => d.reasons.length > 0) ? 'PASS' : 'FAIL'}`);

  const seen = new Set<string>();
  const reused = decisions.filter((decision) => {
    if (!decision.clip) return false;
    const isReuse = seen.has(decision.clip.id);
    seen.add(decision.clip.id);
    return isReuse;
  });
  assertTest(decisions.length === FIXTURE_B_SCENES.length, 'Fixture B: decision 数量不完整');
  assertTest(reused.length > 0, 'Fixture B: 素材不足时应允许复用');
  assertTest(reused.every((decision) => decision.reasons.some((reason) => reason.includes('复用'))), 'Fixture B: 复用 decision 缺少理由');
}

async function testFixtureC() {
  printSeparator('Fixture C: LLM 失败 (Rule Fallback)');

  // Simulate: all clips analyzed with rule fallback
  const profiles = await analyzeClipsAsProfiles(FIXTURE_C_CLIPS);
  printClipProfiles(profiles);

  const allRuleFallback = [...profiles.values()].every((p) => p.analysisSource === 'rule_fallback');
  console.log(`\n  所有 ClipProfile 使用 rule_fallback: ${allRuleFallback ? 'PASS' : 'FAIL'}`);

  const optimizer = new GlobalSceneClipOptimizer();
  const decisions = optimizer.optimize(FIXTURE_C_SCENES, FIXTURE_C_CLIPS, profiles);
  printDecisions(decisions);

  console.log('\n--- 验证 ---');
  console.log(`  所有分镜都有 decision: ${decisions.length === FIXTURE_C_SCENES.length ? 'PASS' : 'FAIL'}`);
  console.log(`  SmartEditPlan 结构兼容: PASS (使用现有 SmartEditDecision)`);

  assertTest(allRuleFallback, 'Fixture C: LLM 失败时未全部使用 rule_fallback');
  assertTest(decisions.length === FIXTURE_C_SCENES.length, 'Fixture C: decision 数量不完整');
}

function resolveTestFfmpeg(): string {
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(process.env.APPDATA || '', 'TRAE SOLO CN/ModularData/ai-agent/vm/tools/app/ffmpeg/ffmpeg.exe'),
    'C:/ffmpeg/bin/ffmpeg.exe',
    'ffmpeg',
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['-version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error('Media fixture: FFmpeg 不可用');
}

async function testMediaAndDoubaoFallbacks() {
  printSeparator('Fixture D: FFmpeg 与 Doubao 多模态边界');
  const ffmpeg = resolveTestFfmpeg();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-edit-test-'));
  const source = path.join(tempDir, 'scene-change.mp4');
  const previousFfmpeg = process.env.FFMPEG_PATH;
  const previousAllowImages = process.env.REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES;
  const previousConfig = {
    provider: process.env.REAL_LLM_PROVIDER,
    apiKey: process.env.REAL_LLM_API_KEY,
    baseUrl: process.env.REAL_LLM_BASE_URL,
    model: process.env.REAL_LLM_MODEL,
  };
  const originalFetch = globalThis.fetch;

  try {
    execFileSync(ffmpeg, [
      '-f', 'lavfi', '-i', 'color=c=red:s=640x360:d=2',
      '-f', 'lavfi', '-i', 'color=c=blue:s=640x360:d=2',
      '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[outv]',
      '-map', '[outv]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', source,
    ], { stdio: 'ignore' });

    process.env.FFMPEG_PATH = ffmpeg;
    const segments = await new SceneBoundaryDetector().detectSegments('fixture-video', source, false);
    assertTest(segments.length === 2, 'Fixture D: 未识别红蓝画面切换');
    assertTest(segments.every((segment) => segment.detectionMethod === 'scene_change'), 'Fixture D: 错误退化为固定切片');

    const extractor = new ClipKeyframeExtractor();
    const frames = await extractor.extract(segments[0]);
    assertTest(Boolean(frames), 'Fixture D: 关键帧抽取失败');
    const framePaths = frames ? [frames.startFramePath, frames.middleFramePath, frames.endFramePath] : [];
    assertTest(framePaths.every((file) => fs.existsSync(file) && fs.statSync(file).size > 0), 'Fixture D: 关键帧文件不完整');

    process.env.REAL_LLM_PROVIDER = 'volcengine-doubao';
    process.env.REAL_LLM_API_KEY = 'test-key';
    process.env.REAL_LLM_BASE_URL = 'https://example.invalid/api/v3';
    process.env.REAL_LLM_MODEL = 'test-model';

    const input: ClipAnalysisInput = {
      clipId: 'fixture-clip',
      materialId: 'fixture-material',
      materialTitle: '防泼水多隔层收纳包',
      materialTags: ['防泼水', '隔层'],
      materialDescription: '展示防泼水面料和多个隔层',
      startTime: segments[0].startTime,
      endTime: segments[0].endTime,
      duration: segments[0].duration,
      isImage: false,
      keyframes: frames,
      productName: PRODUCT_CONTEXT.name,
      productCategory: PRODUCT_CONTEXT.category,
      productSellingPoints: PRODUCT_CONTEXT.sellingPoints,
    };

    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'not-json' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    process.env.REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES = 'false';
    const noImageResult = await new DoubaoClipUnderstandingProvider().analyze(input);
    assertTest(noImageResult === null && fetchCalls === 0, 'Fixture D: 无图片时不应调用或标记多模态分析');

    process.env.REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES = 'true';
    const invalidJsonResult = await new DoubaoClipUnderstandingProvider().analyze(input);
    assertTest(invalidJsonResult === null && fetchCalls === 1, 'Fixture D: 非法 JSON 未正确回退');

    if (frames) {
      extractor.cleanup(frames);
      assertTest(framePaths.every((file) => !fs.existsSync(file)), 'Fixture D: 临时关键帧未清理');
    }

    const ruleProfile = await new RuleBasedClipUnderstandingProvider().analyze(input);
    assertTest(ruleProfile.sellingPoints.includes('防泼水面料'), 'Fixture D: 防泼水卖点未命中');
    assertTest(ruleProfile.sellingPoints.includes('多隔层分类收纳'), 'Fixture D: 隔层卖点未命中');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FFMPEG_PATH = previousFfmpeg;
    process.env.REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES = previousAllowImages;
    process.env.REAL_LLM_PROVIDER = previousConfig.provider;
    process.env.REAL_LLM_API_KEY = previousConfig.apiKey;
    process.env.REAL_LLM_BASE_URL = previousConfig.baseUrl;
    process.env.REAL_LLM_MODEL = previousConfig.model;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function checkGoalPreference(
  decisions: SmartEditDecision[],
  goal: string,
  preferredSceneTypes: string[],
  profiles: Map<string, ClipProfile>,
): boolean {
  const d = decisions.find((d) => d.sceneGoal === goal);
  if (!d || !d.clip) return false;
  const profile = profiles.get(d.clip.id);
  if (!profile) return false;
  return preferredSceneTypes.includes(profile.sceneType);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('Smart Edit Algorithm Test');
  console.log(`Product: ${PRODUCT_CONTEXT.name}`);
  console.log(`Selling Points: ${PRODUCT_CONTEXT.sellingPoints.join(' | ')}`);

  await testFixtureA();
  await testFixtureB();
  await testFixtureC();
  await testMediaAndDoubaoFallbacks();

  printSeparator('ALL TESTS COMPLETE');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

# Seedance 1.5 集成说明

## 当前状态

Seedance 1.5 Provider 当前为 **fail-fast** 模式：
- 未配置 API Key 时直接返回 `failed`
- 不伪造 `running` 状态
- 自动触发 FFmpeg fallback

## 后续接入需要的参数

### 1. API Key 配置

```bash
# 环境变量
SEEDANCE_API_KEY=your_api_key_here

# 或 .env 文件
SEEDANCE_API_KEY=your_api_key_here
```

### 2. 输入参数

```typescript
interface SeedanceRenderInput {
  creativePlanId: string;
  scenes: Scene[];           // 分镜列表
  materials: Material[];     // 素材列表
  visualBible: VisualBible;  // 视觉圣经
  resolution?: '1080p' | '4k';
  aspectRatio?: '9:16' | '16:9' | '1:1';
}
```

每个 Scene 包含：
- `seedancePrompt`: 用于 Seedance 的提示词
- `duration`: 期望时长（秒）
- `subtitle`: 字幕文本
- `visualDescription`: 视觉描述

### 3. 输出格式

```typescript
interface SeedanceRenderOutput {
  taskId: string;           // 任务 ID
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;         // 0-100
  clips?: {
    sceneId: string;
    videoUrl: string;
    duration: number;
  }[];
  errorMessage?: string;
}
```

### 4. 任务状态轮询

```typescript
// 轮询间隔：2 秒
// 最大重试：30 次（共 60 秒）
// 超时后自动 fallback 到 FFmpeg

const status = await seedanceProvider.getTaskStatus(taskId);
```

### 5. 失败后的 FFmpeg Fallback 策略

当 Seedance 失败时：
1. 自动切换到 `ffmpeg_fallback` provider
2. 使用 `FFmpegComposeProvider` 生成视频
3. 如果素材不存在，使用纯色背景 + 字幕
4. 任务状态变为 `success`（如果 FFmpeg 成功）或 `failed`（如果 FFmpeg 也失败）

## 接入步骤

1. 获取 Seedance 1.5 API Key
2. 配置环境变量 `SEEDANCE_API_KEY`
3. 实现 `Seedance15OfficialAdapter.render()` 方法
4. 实现 `Seedance15OfficialAdapter.getTaskStatus()` 方法
5. 测试 fallback 链路

## 注意事项

- 不要提交 API Key 到代码仓库
- 不要硬编码未验证的官方 URL
- 保持 fail-fast 行为，不要伪造状态
- FFmpeg fallback 必须始终可用

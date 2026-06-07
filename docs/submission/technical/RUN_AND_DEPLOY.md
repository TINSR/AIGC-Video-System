# ClipShop AI 运行与部署说明

> 基线分支：`codex/day17-final-integration`
> 本文档仅使用环境变量**占位符**，请勿写入真实密钥。

---

## 1. 环境依赖

| 依赖 | 要求 | 说明 |
|------|------|------|
| Node.js | 18+ | 前后端运行时 |
| npm | 9+ | 包管理 |
| MySQL | 8+ | 业务数据持久化 |
| FFmpeg | 8.x 推荐 | 智能剪辑、fallback 合成 |
| FFprobe | 随 FFmpeg 安装 | 读取视频时长 |
| Redis | 5+（可选） | BullMQ 队列；不可用时 API 仍可运行 |

### 外部服务（按演示能力选配）

| 服务 | 用途 |
|------|------|
| Doubao（火山方舟） | CreativePlan Real LLM、参考视频分析、Clip 视觉理解 |
| Seedance 1.5 | AI 视频生成 |
| 阿里云 OSS | 素材公网 URL，供远端模型访问 |
| Xiaomi MiMo TTS | 智能剪辑配音（可选） |

---

## 2. 获取代码

```powershell
git clone https://github.com/TINSR/AIGC-Video-System.git
cd AIGC-Video-System
git checkout codex/day17-final-integration
```

---

## 3. 安装依赖

在仓库根目录：

```powershell
npm install
```

---

## 4. 环境变量

复制 `apps/api/.env.example` 为 `apps/api/.env`，按占位符填写：

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/creative_video"
REDIS_URL="redis://127.0.0.1:6379"
PORT="3001"
UPLOAD_DIR="./uploads"
OUTPUT_DIR="./outputs"
NODE_ENV="development"

# Real LLM（Doubao / MiMo 等，可选）
REAL_LLM_PROVIDER=""
REAL_LLM_API_KEY=""
REAL_LLM_BASE_URL=""
REAL_LLM_MODEL=""
REAL_LLM_ALLOW_LOCAL_BASE64_IMAGES="false"

# Seedance
SEEDANCE_API_KEY=""
SEEDANCE_API_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
SEEDANCE_MODEL_ID=""
ALLOW_FFMPEG_FALLBACK="true"

# 参考视频分析
REFERENCE_VIDEO_ANALYSIS_ALLOW_MOCK="false"

# 阿里云 OSS
OBJECT_STORAGE_PROVIDER="aliyun_oss"
ALIYUN_OSS_REGION=""
ALIYUN_OSS_BUCKET=""
ALIYUN_OSS_ENDPOINT=""
ALIYUN_OSS_ACCESS_KEY_ID=""
ALIYUN_OSS_ACCESS_KEY_SECRET=""
ALIYUN_OSS_PUBLIC_BASE_URL=""

# Xiaomi MiMo TTS（可选）
MIMO_API_KEY=""
MIMO_TTS_BASE_URL="https://api.xiaomimimo.com/v1"
MIMO_TTS_MODEL="mimo-v2.5-tts"
TTS_VOICE="冰糖"

# FFmpeg
FFMPEG_PATH=""
```

前端 `apps/web/.env`（局域网演示时）：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://<局域网IP>:3001/api
```

---

## 5. 数据库初始化

```powershell
npm.cmd --prefix apps/api run db:generate
npx.cmd --prefix apps/api prisma migrate deploy
```

若 shadow database 导致 `migrate dev` 失败，**本地演示**可临时使用：

```powershell
npx.cmd --prefix apps/api prisma db push
```

> `db push` 仅适用于本地演示，不作为生产迁移方案。

可选种子数据（Analytics Mock）：

```powershell
# 通过 API POST /api/analytics/metrics/mock-seed
```

---

## 6. FFmpeg 配置

### Windows（winget）

```powershell
winget install --id Gyan.FFmpeg -e
```

安装后**重启终端**，验证：

```powershell
ffmpeg -version
ffprobe -version
```

若 PATH 未生效，在 `apps/api/.env` 设置：

```env
FFMPEG_PATH="C:/path/to/ffmpeg/bin/ffmpeg.exe"
```

---

## 7. 启动服务

### 后端

```powershell
npm.cmd --prefix apps/api run dev
```

或生产构建：

```powershell
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/api run start
```

### 前端

```powershell
npm.cmd --prefix apps/web run dev
```

---

## 8. 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3001/api |
| 健康检查 | http://localhost:3001/api/health |
| 静态上传 | http://localhost:3001/uploads/... |
| 成片输出 | http://localhost:3001/outputs/{taskId}.mp4 |

---

## 9. 局域网访问

1. 查本机 IP：`ipconfig`
2. 前端 `.env` 设置 `VITE_API_BASE_URL=http://<IP>:3001/api`
3. 后端已监听 `0.0.0.0`（Vite `--host 0.0.0.0`）
4. Windows 防火墙放行 **5173**、**3001**

访问：`http://<IP>:5173`

---

## 10. 构建验证

```powershell
npm.cmd --prefix apps/api run build
npm.cmd --prefix apps/web run build
```

---

## 11. Smoke 测试

```powershell
powershell -ExecutionPolicy Bypass -File tools/day16-smart-edit-smoke.ps1
powershell -ExecutionPolicy Bypass -File tools/day16-patch-regression.ps1
```

需 API 已启动且数据库有演示商品数据。

---

## 12. 常见问题

| 现象 | 处理 |
|------|------|
| 智能剪辑任务在 FFmpeg 步骤失败 | 安装 FFmpeg 或配置 `FFMPEG_PATH`，重启 API |
| Seedance 失败 | 检查 `SEEDANCE_API_KEY`；或 `ALLOW_FFMPEG_FALLBACK=true` |
| 远端模型无法读本地 `/uploads` | 配置 OSS `publicUrl` 或启用调试 Base64（仅本地） |
| Redis 版本不足 | 日志提示 worker 未启动，不影响 API 内同步渲染 |
| Prisma EPERM | 停止占用 `node_modules` 的 API 进程后重跑 `db:generate` |
| MiMo TTS 无声音 | 检查 `MIMO_API_KEY`、账号额度；`tp-` 前缀 Key 走 token-plan 端点 |

---

## 13. 生产边界说明

- 生产环境建议 `ALLOW_FFMPEG_FALLBACK=false`，避免静默降级。
- 禁止将 `.env`、API Key 提交 Git。
- 演示视频与截图勿包含密钥或个人隐私。

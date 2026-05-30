import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  family: 4,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
});

export let redisAvailable = false;
export let redisVersion = '';

let lastRedisErrorLogAt = 0;

redis.on('connect', async () => {
  console.log('✅ Redis 连接成功');
  try {
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      redisVersion = versionMatch[1];
      const [major] = redisVersion.split('.').map(Number);
      if (major >= 5) {
        redisAvailable = true;
        console.log(`✅ Redis 版本 ${redisVersion} 满足要求（BullMQ 可选）`);
      } else {
        console.warn(`⚠️ Redis 版本 ${redisVersion} 低于 5.0.0，队列功能将不可用`);
      }
    }
  } catch (e) {
    console.error('❌ 无法获取 Redis 版本信息:', e);
  }
});

redis.on('error', (err) => {
  const now = Date.now();
  if (now - lastRedisErrorLogAt < 15000) return;
  lastRedisErrorLogAt = now;
  console.warn(
    '⚠️ Redis 不可用（主链路 render 不依赖 Redis，可继续本地演示）:',
    err instanceof Error ? err.message : err
  );
});

// 非阻塞探测，避免模块加载时刷屏
redis.connect().catch(() => {
  /* 错误已在 error 事件中节流输出 */
});

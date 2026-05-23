import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  family: 4, // 强制使用IPv4
});

export let redisAvailable = false;
export let redisVersion = '';

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
        console.log(`✅ Redis 版本 ${redisVersion} 满足要求`);
      } else {
        console.warn(`⚠️ Redis 版本 ${redisVersion} 低于 5.0.0，队列功能将不可用`);
      }
    }
  } catch (e) {
    console.error('❌ 无法获取Redis版本信息:', e);
  }
});

redis.on('error', (err) => {
  console.error('❌ Redis 连接失败:', err);
});

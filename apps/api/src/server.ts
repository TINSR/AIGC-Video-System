import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 服务器已启动，运行在 http://localhost:${PORT}`);
  console.log(`📝 健康检查接口: http://localhost:${PORT}/api/health`);
});

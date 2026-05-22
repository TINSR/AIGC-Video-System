import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import './config/redis';
import './jobs/renderWorker';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const outputDir = process.env.OUTPUT_DIR || './outputs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/outputs', express.static(path.join(__dirname, '../outputs')));

import productRoutes from './modules/products/product.routes';
// import materialRoutes from './modules/materials/material.routes';
// import creativePlanRoutes from './modules/creative-plans/creativePlan.routes';
// import renderRoutes from './modules/render/render.routes';
// import analyticsRoutes from './modules/analytics/analytics.routes';

app.use('/api/products', productRoutes);
// app.use('/api/materials', materialRoutes);
// app.use('/api/creative-plans', creativePlanRoutes);
// app.use('/api/tasks', renderRoutes);
// app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '接口不存在' } });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } });
});

export default app;

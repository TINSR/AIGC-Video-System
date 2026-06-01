import { Router } from 'express';
import multer from 'multer';
import { MaterialController } from './material.controller';

const router = Router();
const controller = new MaterialController();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持图片和视频'));
    }
  },
});

router.get('/products/:productId/materials', controller.list);
router.post('/products/:productId/materials', upload.single('file'), controller.upload);
router.put('/products/:productId/materials/:materialId/primary', controller.setPrimary);
router.get('/materials/:id', controller.get);
router.put('/materials/:id', controller.update);
router.delete('/materials/:id', controller.delete);

export default router;

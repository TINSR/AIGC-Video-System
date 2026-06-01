import { Router } from 'express';
import multer from 'multer';
import { ReferenceVideoController } from './referenceVideo.controller';

const router = Router();
const controller = new ReferenceVideoController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持视频'));
    }
  },
});

router.post('/reference-videos', controller.create);
router.post('/reference-videos/upload', upload.single('file'), controller.upload);
router.get('/reference-videos', controller.list);
router.get('/reference-videos/:id', controller.getById);
router.post('/reference-videos/:id/analyze', controller.analyze);

export default router;

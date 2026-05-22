import { Router } from 'express';
import * as productController from './product.controller';

const router = Router();

router.post('/', productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);

export default router;

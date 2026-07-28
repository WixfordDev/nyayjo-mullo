import express from 'express';
import * as priceController from '../../controllers/price.controller';
import auth from '../../middlewares/auth';
import fileUpload from '../../middlewares/fileUpload';

const upload = fileUpload();

const router = express.Router();

// Public read routes (no auth required)
router.route('/').get(priceController.getPrices);
router.route('/basket').get(priceController.getBasket);
router.route('/heatmap').get(priceController.getHeatmap);
router.route('/home-summary').get(priceController.getHomeSummary);
router.route('/market-index').get(priceController.getMarketIndex);
router.route('/history/:productId').get(priceController.getPriceHistory);
router.route('/:priceId').get(priceController.getPrice);

// Auth required for write operations
router.route('/').post(auth('common'), upload.single('photo'), priceController.createPrice);
router.route('/:priceId').delete(auth('common'), priceController.deletePrice);
router.route('/:priceId/vote').post(auth('common'), priceController.votePrice);
router.route('/:priceId/stock-out').post(auth('common'), priceController.markStockOut);

export default router;

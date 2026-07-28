import { Request, Response } from 'express';
import httpStatus from 'http-status';
import response from '../config/response';
import { priceService } from '../services';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';
import { uploadToCloudinary } from '../config/cloudinary';

const createPrice = catchAsync(async (req: Request, res: Response) => {
  const priceData: any = {
    ...req.body,
    userId: (req as any).user._id,
  };
  if ((req as any).file) {
    priceData.photoUrl = await uploadToCloudinary((req as any).file.buffer, 'bazar-dor/price-proofs');
  }
  const price = await priceService.createPrice(priceData);
  res.status(httpStatus.CREATED).json(
    response({
      message: 'Price submitted successfully',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: price,
    }),
  );
});

const getPrices = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['productId', 'bazarId', 'userId', 'isVerified', 'isStockOut']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await priceService.queryPrices(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: 'Prices retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getPrice = catchAsync(async (req: Request, res: Response) => {
  const priceId = Array.isArray(req.params.priceId)
    ? req.params.priceId[0]
    : req.params.priceId;
  const price = await priceService.getPriceById(priceId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Price retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: price,
    }),
  );
});

const deletePrice = catchAsync(async (req: Request, res: Response) => {
  const priceId = Array.isArray(req.params.priceId)
    ? req.params.priceId[0]
    : req.params.priceId;
  const price = await priceService.deletePriceById(priceId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Price deleted successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: price,
    }),
  );
});

const votePrice = catchAsync(async (req: Request, res: Response) => {
  const priceId = Array.isArray(req.params.priceId)
    ? req.params.priceId[0]
    : req.params.priceId;
  const { voteType } = req.body;
  const userId = (req as any).user._id;
  const price = await priceService.votePrice(priceId, voteType, userId);

  // Emit socket event if verified
  const io = (req as any).app.get('io');
  if (io && price.isVerified) {
    io.emit('price:verified', { priceId: price._id, confidenceScore: price.confidenceScore });
  }

  res.status(httpStatus.OK).json(
    response({
      message: 'Vote recorded successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: price,
    }),
  );
});

const markStockOut = catchAsync(async (req: Request, res: Response) => {
  const priceId = Array.isArray(req.params.priceId)
    ? req.params.priceId[0]
    : req.params.priceId;
  const price = await priceService.markStockOut(priceId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Stock out marked successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: price,
    }),
  );
});

const getBasket = catchAsync(async (req: Request, res: Response) => {
  const { bazarId } = req.query as { bazarId: string };
  const result = await priceService.getBasketSummary(bazarId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Basket summary retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getHeatmap = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.query as { productId: string };
  const result = await priceService.getHeatmapData(productId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Heatmap data retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getPriceHistory = catchAsync(async (req: Request, res: Response) => {
  const productId = Array.isArray(req.params.productId)
    ? req.params.productId[0]
    : req.params.productId;
  const { bazarId } = req.query as { bazarId?: string };
  const result = await priceService.getPriceHistory(productId, bazarId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Price history retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getHomeSummary = catchAsync(async (req: Request, res: Response) => {
  const { lat, lng, radius, bazarId } = req.query as {
    lat?: string; lng?: string; radius?: string; bazarId?: string;
  };

  const result = await priceService.getHomeSummary({
    lat:     lat     ? parseFloat(lat)     : undefined,
    lng:     lng     ? parseFloat(lng)     : undefined,
    radius:  radius  ? parseFloat(radius)  : undefined,
    bazarId: bazarId || undefined,
  });

  res.status(httpStatus.OK).json(
    response({
      message:    'Home summary retrieved successfully',
      status:     'OK',
      statusCode: httpStatus.OK,
      data:       result,
    }),
  );
});

const getMarketIndex = catchAsync(async (req: Request, res: Response) => {
  const { lat, lng, radius, bazarId } = req.query as {
    lat?: string; lng?: string; radius?: string; bazarId?: string;
  };

  const result = await priceService.getMarketIndex({
    lat:     lat     ? parseFloat(lat)     : undefined,
    lng:     lng     ? parseFloat(lng)     : undefined,
    radius:  radius  ? parseFloat(radius)  : undefined,
    bazarId: bazarId || undefined,
  });

  res.status(httpStatus.OK).json(
    response({
      message:    'Market index retrieved successfully',
      status:     'OK',
      statusCode: httpStatus.OK,
      data:       result,
    }),
  );
});

export {
  createPrice,
  getPrices,
  getPrice,
  deletePrice,
  votePrice,
  markStockOut,
  getBasket,
  getHeatmap,
  getPriceHistory,
  getHomeSummary,
  getMarketIndex,
};

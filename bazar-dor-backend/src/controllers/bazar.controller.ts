import { Request, Response } from 'express';
import httpStatus from 'http-status';
import response from '../config/response';
import { bazarService, osmPlacesService } from '../services';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';

const createBazar = catchAsync(async (req: Request, res: Response) => {
  const bazar = await bazarService.createBazar(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: 'Bazar created successfully',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: bazar,
    }),
  );
});

const getBazars = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'area', 'city', 'isActive', 'search', 'includeInactive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await bazarService.queryBazars(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: 'Bazars retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getBazar = catchAsync(async (req: Request, res: Response) => {
  const bazarId = Array.isArray(req.params.bazarId)
    ? req.params.bazarId[0]
    : req.params.bazarId;
  const bazar = await bazarService.getBazarById(bazarId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Bazar retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: bazar,
    }),
  );
});

const updateBazar = catchAsync(async (req: Request, res: Response) => {
  const bazarId = Array.isArray(req.params.bazarId)
    ? req.params.bazarId[0]
    : req.params.bazarId;
  const bazar = await bazarService.updateBazarById(bazarId, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: 'Bazar updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: bazar,
    }),
  );
});

const deleteBazar = catchAsync(async (req: Request, res: Response) => {
  const bazarId = Array.isArray(req.params.bazarId)
    ? req.params.bazarId[0]
    : req.params.bazarId;
  const bazar = await bazarService.deleteBazarById(bazarId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Bazar deleted successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: bazar,
    }),
  );
});

const getNearbyBazars = catchAsync(async (req: Request, res: Response) => {
  const lat      = parseFloat(req.query.lat    as string);
  const lng      = parseFloat(req.query.lng    as string);
  const limit    = parseInt(req.query.limit    as string) || 30;
  const radiusKm = parseFloat(req.query.radius as string) || 10;
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ code: 400, message: 'lat and lng are required' });
    return;
  }
  const result = await bazarService.getNearbyBazars(lat, lng, radiusKm, limit);
  res.status(httpStatus.OK).json(
    response({ message: 'Nearby bazars', status: 'OK', statusCode: httpStatus.OK, data: result }),
  );
});

/**
 * POST /bazars/seed/cell
 * Force-refresh Google Places cache for a specific location.
 * Body: { lat: number, lng: number }
 */
const seedCell = catchAsync(async (req: Request, res: Response) => {
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ code: 400, message: 'lat and lng are required' });
    return;
  }
  const result = await osmPlacesService.refreshCell(lat, lng);
  res.status(httpStatus.OK).json(
    response({ message: `Cell ${result.gridKey} refreshed — ${result.count} bazars saved`, status: 'OK', statusCode: httpStatus.OK, data: result }),
  );
});

/**
 * GET /bazars/seed/status?lat=&lng=
 * Check cache status for a grid cell.
 */
const getCacheStatus = catchAsync(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ code: 400, message: 'lat and lng are required' });
    return;
  }
  const cell = await osmPlacesService.getCellStatus(lat, lng);
  res.status(httpStatus.OK).json(
    response({ message: 'Cache status', status: 'OK', statusCode: httpStatus.OK, data: cell ?? { cached: false } }),
  );
});

export { createBazar, getBazars, getBazar, updateBazar, deleteBazar, getNearbyBazars, seedCell, getCacheStatus };

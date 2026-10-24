import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { Bazar } from '../models';
import * as osmPlacesService from './osmPlaces.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

const createBazar = async (data: any) => {
  const bazar = await Bazar.create(data);
  return bazar;
};

const queryBazars = async (filter: any, options: any) => {
  const { limit = 20, page = 1 } = options;
  const { search, includeInactive, ...exactFilter } = filter;

  const mongoFilter: any = { ...exactFilter };
  // Public callers (Home/Heatmap/Planner/AllProducts location-fallback search) never pass
  // `isActive` explicitly, so default to active-only — matches getNearbyBazars' behavior.
  // Admin management explicitly passes `includeInactive` to see everything.
  if (mongoFilter.isActive === undefined && !includeInactive) {
    mongoFilter.isActive = true;
  }
  if (search) {
    mongoFilter.$or = [
      { name:   { $regex: search, $options: 'i' } },
      { nameBn: { $regex: search, $options: 'i' } },
      { area:   { $regex: search, $options: 'i' } },
    ];
  }

  const count      = await Bazar.countDocuments(mongoFilter);
  const totalPages = Math.ceil(count / limit);
  const skip       = (page - 1) * limit;

  const bazars = await Bazar.find(mongoFilter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ name: 1 });

  return { data: bazars, page: parseInt(page), limit: parseInt(limit), totalPages, totalResults: count };
};

const getBazarById = async (id: string) => {
  const bazar = await Bazar.findById(id);
  if (!bazar) throw new ApiError(httpStatus.NOT_FOUND, 'Bazar not found');
  return bazar;
};

const updateBazarById = async (id: string, bodyData: any) => {
  const bazar = await getBazarById(id);
  Object.assign(bazar, bodyData);
  await bazar.save();
  return bazar;
};

const deleteBazarById = async (id: string) => {
  const bazar = await Bazar.findByIdAndDelete(id);
  if (!bazar) throw new ApiError(httpStatus.NOT_FOUND, 'Bazar not found');
  return bazar;
};

// ── Nearby (cache-first) ──────────────────────────────────────────────────────

/**
 * Returns bazars within `radiusKm` of the given coordinates.
 *
 * Strategy:
 *   1. Trigger Google Places cache-fill for this grid cell (non-blocking).
 *      If the cell is already cached / API key missing, this is instant.
 *   2. Query MongoDB with a 2dsphere $nearSphere index — O(log n), efficient.
 *   3. Attach computed distance and return sorted list.
 */
const getNearbyBazars = async (lat: number, lng: number, radiusKm = 5, limit = 30) => {
  // Non-blocking cache-fill: fire-and-await so first request gets fresh data,
  // but we don't let Google API errors propagate to the user.
  await osmPlacesService.ensureCellCached(lat, lng).catch((err) => {
    console.error('[BazarService] OSM cache-fill failed:', err?.message);
  });

  // Geospatial query — uses the 2dsphere index for sub-millisecond lookups
  const bazars = await Bazar.find({
    isActive: true,
    location: {
      $nearSphere: {
        $geometry:    { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  }).limit(limit);

  return bazars.map((b: any) => ({
    ...b.toJSON(),
    distance: Math.round(haversineKm(lat, lng, b.lat, b.lng) * 10) / 10,
  }));
};

export {
  createBazar,
  queryBazars,
  getBazarById,
  updateBazarById,
  deleteBazarById,
  getNearbyBazars,
};

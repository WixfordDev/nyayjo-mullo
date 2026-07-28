import mongoose from 'mongoose';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { Price, Bazar, Product } from '../models';
import { detectPriceSpike } from './alert.service';

const createPrice = async (data: any) => {
  const price = await Price.create(data);

  // Auto-alert if price is a spike (non-blocking)
  if (price.productId && price.price) {
    detectPriceSpike(
      price.productId.toString(),
      price.price,
      price.bazarId?.toString(),
      price.userId?.toString(),
    );
  }

  return price;
};

const queryPrices = async (filter: any, options: any) => {
  const { limit = 20, page = 1 } = options;
  const count = await Price.countDocuments(filter);
  const totalPages = Math.ceil(count / limit);
  const skip = (page - 1) * limit;

  const prices = await Price.find(filter)
    .populate('productId', 'name nameBn unit icon image category')
    .populate('bazarId', 'name nameBn area city')
    .populate('userId', '_id name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  return {
    data: prices,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    totalResults: count,
  };
};

const getPriceById = async (id: string) => {
  const price = await Price.findById(id)
    .populate('productId', 'name nameBn unit icon image category')
    .populate('bazarId', 'name nameBn area city')
    .populate('userId', '_id name');
  if (!price) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price entry not found');
  }
  return price;
};

const updatePriceById = async (id: string, bodyData: any) => {
  const price = await getPriceById(id);
  Object.assign(price, bodyData);
  await price.save();
  return price;
};

const deletePriceById = async (id: string) => {
  const price = await Price.findByIdAndDelete(id);
  if (!price) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price entry not found');
  }
  return price;
};

const votePrice = async (priceId: string, voteType: 'up' | 'down', userId: string) => {
  const price = await Price.findById(priceId);
  if (!price) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price entry not found');
  }

  // Check if this user already voted on this price
  const alreadyVoted = price.voters.some(
    (v: any) => v.userId.toString() === userId.toString()
  );
  if (alreadyVoted) {
    throw new ApiError(httpStatus.CONFLICT, 'আপনি ইতিমধ্যে এই দামে ভোট দিয়েছেন');
  }

  // Record voter
  price.voters.push({ userId: userId as any, voteType });

  if (voteType === 'up') {
    price.upvotes += 1;
  } else {
    price.downvotes += 1;
  }

  // Recalculate confidence score
  const total = price.upvotes + price.downvotes;
  if (total > 0) {
    price.confidenceScore = Math.round((price.upvotes / total) * 100);
    // Auto-verify if confidence > 70% and at least 3 votes
    if (price.confidenceScore >= 70 && total >= 3) {
      price.isVerified = true;
    }
  }

  await price.save();
  return price;
};

const markStockOut = async (priceId: string) => {
  const price = await Price.findById(priceId);
  if (!price) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Price entry not found');
  }
  price.isStockOut = true;
  await price.save();
  return price;
};

const getBasketSummary = async (bazarId: string) => {
  const prices = await Price.aggregate([
    {
      $match: {
        bazarId: new (require('mongoose').Types.ObjectId)(bazarId),
        isStockOut: false,
        expiresAt: { $gte: new Date() },
      },
    },
    {
      $group: {
        _id: '$productId',
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $project: {
        productId: '$_id',
        name: '$product.name',
        nameBn: '$product.nameBn',
        unit: '$product.unit',
        icon: '$product.icon',
        avgPrice: { $round: ['$avgPrice', 2] },
        minPrice: 1,
        maxPrice: 1,
        submissionCount: '$count',
      },
    },
  ]);

  return prices;
};

const getHeatmapData = async (productId: string) => {
  const prices = await Price.aggregate([
    {
      $match: {
        productId: new (require('mongoose').Types.ObjectId)(productId),
        isStockOut: false,
        expiresAt: { $gte: new Date() },
      },
    },
    {
      $group: {
        _id: '$bazarId',
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'bazars',
        localField: '_id',
        foreignField: '_id',
        as: 'bazar',
      },
    },
    { $unwind: '$bazar' },
    {
      $project: {
        bazarId: '$_id',
        name: '$bazar.name',
        nameBn: '$bazar.nameBn',
        lat: '$bazar.lat',
        lng: '$bazar.lng',
        area: '$bazar.area',
        avgPrice: { $round: ['$avgPrice', 2] },
        submissionCount: '$count',
      },
    },
  ]);

  return prices;
};

const getPriceHistory = async (productId: string, bazarId?: string) => {
  const matchStage: any = {
    productId: new (require('mongoose').Types.ObjectId)(productId),
  };
  if (bazarId) {
    matchStage.bazarId = new (require('mongoose').Types.ObjectId)(bazarId);
  }

  const history = await Price.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bazarId: '$bazarId',
        },
        avgPrice: { $avg: '$price' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
    {
      $project: {
        date: '$_id.date',
        bazarId: '$_id.bazarId',
        avgPrice: { $round: ['$avgPrice', 2] },
        count: 1,
      },
    },
  ]);

  return history;
};

// ─── Essential basket pattern (mirrors frontend list) ───────────────────────
const ESSENTIAL_BASKET = [
  { key: 'rice',    label: 'চাল',         unit: 'কেজি',  qty: 1, match: (n: string) => /চাল|rice/i.test(n) },
  { key: 'chicken', label: 'মুরগি',       unit: 'কেজি',  qty: 1, match: (n: string) => /মুরগি|chicken/i.test(n) },
  { key: 'oil',     label: 'সয়াবিন তেল', unit: 'লিটার', qty: 1, match: (n: string) => /তেল|oil/i.test(n) },
  { key: 'onion',   label: 'পেঁয়াজ',     unit: 'কেজি',  qty: 1, match: (n: string) => /পেঁয়াজ|onion/i.test(n) },
  { key: 'potato',  label: 'আলু',         unit: 'কেজি',  qty: 2, match: (n: string) => /আলু|potato/i.test(n) },
];

const BN_MONTHS = ['জান', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];

/** Resolve a Mongo filter restricting prices to a specific bazar or nearby bazars. */
const resolveBazarFilter = async (params: { lat?: number; lng?: number; radius?: number; bazarId?: string }) => {
  const { lat, lng, radius = 10, bazarId } = params;
  if (bazarId) return { bazarId: new mongoose.Types.ObjectId(bazarId) };
  if (lat === undefined || lng === undefined) return {};

  const nearbyBazars = await Bazar.find({
    isActive: true,
    location: {
      $nearSphere: {
        $geometry:    { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    },
  }).select('_id').limit(50).lean();

  return nearbyBazars.length > 0
    ? { bazarId: { $in: nearbyBazars.map((b: any) => b._id) } }
    : {};
};

/**
 * Home page summary — single aggregation, server-side calculation.
 * Returns stats + per-product price change data ready for display.
 */
const getHomeSummary = async (params: {
  lat?: number;
  lng?: number;
  radius?: number;
  bazarId?: string;
}) => {
  const now          = new Date();
  const oneDayAgo    = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── 1. Resolve bazar filter ───────────────────────────────────────────────
  const bazarFilter = await resolveBazarFilter(params);

  // ── 2. Aggregate: group all recent prices by product ──────────────────────
  const agg = await Price.aggregate([
    {
      $match: {
        createdAt:  { $gte: sevenDaysAgo },
        isStockOut: { $ne: true },
        ...bazarFilter,
      },
    },
    // Sort so $first picks the best-upvoted entry per product
    { $sort: { upvotes: -1, createdAt: -1 } },
    {
      $group: {
        _id:            '$productId',
        bestPrice:      { $first: '$price' },
        bestBazarId:    { $first: '$bazarId' },
        bestIsVerified: { $first: '$isVerified' },
        // Collect all entries for today/prev comparison
        allEntries: { $push: { price: '$price', createdAt: '$createdAt' } },
        totalCount: { $sum: 1 },
      },
    },
    // Populate product
    {
      $lookup: {
        from:         'products',
        localField:   '_id',
        foreignField: '_id',
        as:           'product',
      },
    },
    // Drop products where productId doesn't exist in products collection
    { $unwind: '$product' },
    // Populate bazar name — keep product even if bazar not found
    {
      $lookup: {
        from:         'bazars',
        localField:   'bestBazarId',
        foreignField: '_id',
        as:           'bazar',
      },
    },
    { $unwind: { path: '$bazar', preserveNullAndEmptyArrays: true } },
    { $limit: 50 },
  ]);

  // ── 3. Post-process: calculate per-product price change ───────────────────
  const products = agg.map((item: any) => {
    const todayEntries = (item.allEntries as any[]).filter(
      (e: any) => new Date(e.createdAt) >= oneDayAgo,
    );
    const prevEntries = (item.allEntries as any[])
      .filter((e: any) => new Date(e.createdAt) < oneDayAgo)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const avg = (arr: any[]) =>
      arr.length ? Math.round(arr.reduce((s, e) => s + e.price, 0) / arr.length) : null;

    const todayAvg  = avg(todayEntries);
    const prevPrice = prevEntries[0]?.price ?? null;
    const daysAgo   = prevEntries[0]
      ? Math.max(1, Math.floor((now.getTime() - new Date(prevEntries[0].createdAt).getTime()) / 86400000))
      : null;
    const change = todayAvg !== null && prevPrice !== null ? todayAvg - prevPrice : null;

    return {
      productId:    item._id,
      name:         item.product.name,
      nameBn:       item.product.nameBn,
      icon:         item.product.icon,
      image:        item.product.image || null,
      unit:         item.product.unit,
      category:     item.product.category || null,
      currentPrice: item.bestPrice,
      prevPrice,
      change,
      daysAgo,
      bazarName:    item.bazar?.nameBn || item.bazar?.name || null,
      isVerified:   item.bestIsVerified,
      updatedToday: todayEntries.length > 0,
    };
  });

  // ── 4. Basket totals ──────────────────────────────────────────────────────
  let basketTotal = 0;
  let basketPrevTotal = 0;

  for (const e of ESSENTIAL_BASKET) {
    const p = products.find(p => e.match(p.nameBn || p.name || ''));
    if (!p?.currentPrice) continue;
    basketTotal += p.currentPrice * e.qty;
    if (p.prevPrice !== null) basketPrevTotal += p.prevPrice * e.qty;
  }

  const basketChange = basketTotal > 0 && basketPrevTotal > 0 ? basketTotal - basketPrevTotal : null;
  const savings      = basketChange !== null && basketChange < 0 ? Math.abs(basketChange) : null;

  return {
    stats: {
      totalProducts: products.length,
      updatedToday:  products.filter(p => p.updatedToday).length,
      basketTotal:   basketTotal || null,
      basketChange,
      savings,
    },
    products,
  };
};

/**
 * Market index ("দামের চার্ট") — essential-basket trend over the last 7 days,
 * computed entirely server-side: daily basket totals, high/low/avg/change
 * stats, an auto-generated insight tip, and per-item current price + change.
 */
const getMarketIndex = async (params: {
  lat?: number;
  lng?: number;
  radius?: number;
  bazarId?: string;
}) => {
  const now          = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const bazarFilter  = await resolveBazarFilter(params);

  // ── 1. Find product IDs matching each essential-basket item ───────────────
  const allProducts = await Product.find({}).select('_id name nameBn').lean();
  const productIdsByKey: Record<string, string[]> = {};
  for (const e of ESSENTIAL_BASKET) {
    productIdsByKey[e.key] = allProducts
      .filter((p: any) => e.match(p.nameBn || p.name || ''))
      .map((p: any) => p._id.toString());
  }
  const allEssentialIds = Object.values(productIdsByKey).flat();

  // ── 2. Fetch last 7 days of prices for those products ──────────────────────
  const prices = await Price.find({
    productId:  { $in: allEssentialIds.map(id => new mongoose.Types.ObjectId(id)) },
    createdAt:  { $gte: sevenDaysAgo },
    isStockOut: { $ne: true },
    ...bazarFilter,
  }).select('productId price createdAt isSeed').lean();

  // Real submissions always take priority over placeholder seed data —
  // a day/item only falls back to seed prices when no real entry exists yet.
  const preferReal = (arr: any[]) => {
    const real = arr.filter((p: any) => !p.isSeed);
    return real.length > 0 ? real : arr;
  };

  // ── 3. Bucket into 7 daily basket totals ────────────────────────────────────
  const dayBuckets: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - (i + 1) * 86400000);
    const dayEnd   = new Date(now.getTime() - i * 86400000);
    const d        = new Date(dayEnd);
    const label    = `${d.getDate()} ${BN_MONTHS[d.getMonth()]}`;

    let total  = 0;
    let hasAny = false;
    for (const e of ESSENTIAL_BASKET) {
      const ids       = new Set(productIdsByKey[e.key]);
      const dayPrices = preferReal(prices.filter((p: any) =>
        ids.has(p.productId.toString()) &&
        new Date(p.createdAt) >= dayStart &&
        new Date(p.createdAt) < dayEnd,
      ));
      if (dayPrices.length > 0) {
        const avg = dayPrices.reduce((s: number, p: any) => s + p.price, 0) / dayPrices.length;
        total += avg * e.qty;
        hasAny = true;
      }
    }
    if (hasAny) dayBuckets.push({ label, value: Math.round(total) });
  }

  // ── 4. Stats: highest / lowest / average / change ───────────────────────────
  const values = dayBuckets.map(d => d.value);
  const highest = dayBuckets.length ? dayBuckets.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const lowest  = dayBuckets.length ? dayBuckets.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const average = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;

  const currentPrice = dayBuckets[dayBuckets.length - 1]?.value ?? null;
  const yesterdayPrice = dayBuckets[dayBuckets.length - 2]?.value ?? null;
  const change = currentPrice !== null && yesterdayPrice !== null ? currentPrice - yesterdayPrice : null;
  const changePercent = change !== null && yesterdayPrice ? Math.round((change / yesterdayPrice) * 1000) / 10 : null;

  // ── 5. Per-item current price + change (today vs most-recent prior entry) ──
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const items = ESSENTIAL_BASKET.map(e => {
    const ids = new Set(productIdsByKey[e.key]);
    const itemPrices = prices.filter((p: any) => ids.has(p.productId.toString()));

    const todayPrices = preferReal(itemPrices.filter((p: any) => new Date(p.createdAt) >= oneDayAgo));
    const prevPrices  = preferReal(itemPrices.filter((p: any) => new Date(p.createdAt) < oneDayAgo))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const avg = (arr: any[]) => arr.length ? Math.round(arr.reduce((s, p) => s + p.price, 0) / arr.length) : null;
    const todayAvg  = avg(todayPrices);
    const prevPrice = prevPrices[0]?.price ?? null;
    const itemChange = todayAvg !== null && prevPrice !== null ? todayAvg - prevPrice : null;

    return {
      key:          e.key,
      label:        e.label,
      unit:         e.unit,
      qty:          e.qty,
      currentPrice: todayAvg ?? avg(itemPrices),
      change:       itemChange,
    };
  });

  // ── 6. Insight tip — biggest mover among the basket items ───────────────────
  const biggestMover = items
    .filter(i => i.change !== null && i.currentPrice !== null)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))[0];
  const insightTip = biggestMover?.change
    ? `${biggestMover.label}র দাম ${biggestMover.unit}-তে ৳${Math.abs(biggestMover.change)} ${biggestMover.change > 0 ? 'বেড়েছে।' : 'কমেছে।'} বাজারে যাওয়ার আগে সাম্প্রতিক দাম যাচাই করে নিন।`
    : null;

  return {
    currentPrice,
    change,
    changePercent,
    trend: dayBuckets,
    stats: {
      highest: highest ? { value: highest.value, label: highest.label } : null,
      lowest:  lowest  ? { value: lowest.value,  label: lowest.label }  : null,
      average,
      change,
      changePercent,
    },
    insightTip,
    items,
  };
};

export {
  createPrice,
  queryPrices,
  getPriceById,
  updatePriceById,
  deletePriceById,
  votePrice,
  markStockOut,
  getBasketSummary,
  getHeatmapData,
  getPriceHistory,
  getHomeSummary,
  getMarketIndex,
};

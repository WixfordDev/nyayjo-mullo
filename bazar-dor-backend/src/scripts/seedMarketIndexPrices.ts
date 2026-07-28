/**
 * Seeds minimal placeholder ("isSeed: true") prices for the essential basket
 * (চাল, মুরগি, সয়াবিন তেল, পেঁয়াজ, আলু) across the last 7 days, so the
 * "দামের চার্ট" (market-index) page has something to draw immediately on a
 * fresh database.
 *
 * Placeholder prices are automatically ignored by getMarketIndex() for any
 * day/item that already has a REAL (non-seed) submission — so as real users
 * submit prices, the seed data quietly steps aside on its own. No cleanup
 * needed later.
 *
 * Safe to re-run: it deletes its own previous seed rows first.
 *
 * Usage:
 *   npx ts-node src/scripts/seedMarketIndexPrices.ts
 */

import mongoose from 'mongoose';
import dotenv   from 'dotenv';
import path     from 'path';
import { Product, Bazar, Price } from '../models';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MAX_BAZARS = 5;

const ESSENTIAL_BASKET = [
  { key: 'rice',    label: 'চাল',         basePrice: 48,  match: (n: string) => /চাল|rice/i.test(n) },
  { key: 'chicken', label: 'মুরগি',       basePrice: 211, match: (n: string) => /মুরগি|chicken/i.test(n) },
  { key: 'oil',     label: 'সয়াবিন তেল', basePrice: 100, match: (n: string) => /তেল|oil/i.test(n) },
  { key: 'onion',   label: 'পেঁয়াজ',     basePrice: 40,  match: (n: string) => /পেঁয়াজ|onion/i.test(n) },
  { key: 'potato',  label: 'আলু',         basePrice: 32,  match: (n: string) => /আলু|potato/i.test(n) },
];

const seedMarketIndexPrices = async () => {
  await mongoose.connect(process.env.MONGODB_URL as string);
  console.log('🔌 Connected to MongoDB');

  const { deletedCount } = await Price.deleteMany({ isSeed: true });
  console.log(`🧹 Removed ${deletedCount} old placeholder price(s)`);

  const allProducts = await Product.find({}).select('_id name nameBn').lean();
  const bazars = await Bazar.find({ isActive: true }).select('_id').limit(MAX_BAZARS).lean();

  if (bazars.length === 0) {
    console.log('⚠️  No active bazars found — add at least one bazar before seeding.');
    await mongoose.disconnect();
    return;
  }

  const docs: any[] = [];

  for (const item of ESSENTIAL_BASKET) {
    const product = allProducts.find((p: any) => item.match(p.nameBn || p.name || ''));
    if (!product) {
      console.log(`⚠️  No product matches "${item.label}" — skipping (add this product first).`);
      continue;
    }

    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      // Small day-to-day wobble so the trend line isn't a flat line.
      const wobble = Math.round(item.basePrice * Math.sin(daysAgo * 1.3) * 0.06);
      const price  = Math.max(1, item.basePrice + wobble);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      for (const bazar of bazars) {
        docs.push({
          productId:  product._id,
          bazarId:    bazar._id,
          price,
          visitType:  'physical',
          isVerified: true,
          isSeed:     true,
          createdAt,
          updatedAt:  createdAt,
        });
      }
    }
  }

  if (docs.length === 0) {
    console.log('⚠️  Nothing to seed — make sure চাল/মুরগি/তেল/পেঁয়াজ/আলু products exist first.');
  } else {
    await Price.insertMany(docs, { timestamps: false });
    console.log(`✅ Seeded ${docs.length} placeholder price(s) across ${bazars.length} bazar(s) for the last 7 days.`);
    console.log('   These fade out automatically as real submissions come in for the same day/item.');
  }

  await mongoose.disconnect();
};

seedMarketIndexPrices().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

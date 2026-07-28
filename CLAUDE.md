# Bazar Dor — Architecture & Development Guide

## Project Overview
**নায্যমূল্য (Nayjjo Mullo / Bazar Dor)** is a community-driven Bangladesh bazar price tracker.
Users submit real market prices, vote on accuracy, and see price heatmaps across nearby markets.

## Monorepo Structure
```
bazar-dor-main/
├── bazar-dor-backend/     # Express + MongoDB API
└── bazar-dor-front-end/   # Next.js 14 App Router + RTK Query
```

---

## Frontend (`bazar-dor-front-end/`)

### Tech Stack
- **Next.js 14** — App Router, Server Components where possible
- **RTK Query** — All API calls via `src/store/api/` slices
- **Tailwind CSS** — Utility-first; custom `glass-card` class in globals
- **Recharts** — Price history line charts
- **Leaflet** — Interactive map (dynamic import, SSR disabled)

### Key Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/(main)/Home.tsx` | Home: stats, product grid, basket index |
| `/products` | `app/(main)/products/AllProducts.tsx` | All products with nearby bazar filter |
| `/products/[productId]` | `app/(main)/products/[productId]/ProductDetail.tsx` | Product detail: bazar prices, time-slots, voting, chart |
| `/submit` | `app/(main)/submit/SubmitPrice.tsx` | Submit a price with photo proof |
| `/heatmap` | `app/(main)/heatmap/Heatmap.tsx` | Map + bazar ranking panel |
| `/ranking` | `app/(main)/ranking/Ranking.tsx` | Leaderboard with podium, countdown, profile sheet |
| `/profile` | `app/(main)/profile/Profile.tsx` | User profile, stats, recent submissions |
| `/alerts` | `app/(main)/alerts/Alerts.tsx` | Notification-style alert page |
| `/planner` | `app/(main)/planner/Planner.tsx` | Meal planner with bazar autocomplete search |

### RTK Query API Slices (`src/store/api/`)
| File | Key endpoints |
|------|--------------|
| `bazarApi.ts` | `useGetBazarsQuery`, `useGetNearbyBazarsQuery` |
| `priceApi.ts` | `useGetHomeSummaryQuery`, `useGetPricesQuery`, `useGetPriceHistoryQuery`, `useGetHeatmapQuery`, `useVotePriceMutation`, `useMarkStockOutMutation` |
| `productApi.ts` | `useGetProductsQuery`, `useGetProductQuery` |
| `alertApi.ts` | `useGetAlertsQuery` |
| `snapshotApi.ts` | `useGetDailySnapshotsQuery` |

---

## Home Page Architecture (Production Pattern)

The home page uses a **single backend aggregation endpoint** instead of fetching raw price lists client-side.

### Why backend aggregation?
Fetching 100 raw price documents and computing stats/deduplication/change-calculation in the browser is wrong for production:
- Large payload (each doc has populated product + bazar + user fields)
- Heavy computation on mobile (battery, jank)
- Not cacheable at the API layer
- Multiple round-trips (prices + bazars + snapshots)

### Endpoint: `GET /api/prices/home-summary`
Query params: `?lat=&lng=&radius=10` OR `?bazarId=`

Returns pre-computed, display-ready data:
```json
{
  "stats": {
    "totalProducts": 19,
    "updatedToday":  12,
    "basketTotal":   385,
    "basketChange":  -38,
    "savings":       38
  },
  "products": [{
    "productId":    "...",
    "name":         "Oil",
    "nameBn":       "তেল",
    "icon":         "🛢",
    "unit":         "লিটার",
    "currentPrice": 100,
    "prevPrice":    105,
    "change":       -5,
    "daysAgo":      1,
    "bazarName":    "কারওয়ান বাজার",
    "isVerified":   true,
    "updatedToday": true
  }]
}
```

### Frontend usage (Home.tsx)
```tsx
const summaryParams = selectedBazarId
  ? { bazarId: selectedBazarId }
  : userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng, radius: 10 }
    : {};

const { data: summaryRes } = useGetHomeSummaryQuery(summaryParams);
const stats    = summaryRes?.data?.stats    ?? { ... };
const products = summaryRes?.data?.products ?? [];
```

### Product card display
Each card shows: name + unit, change badge (↑↓ ৳X), current price, "X দিন আগে: Y" comparison.
All values come directly from the server — zero client-side computation.

---

## Location Pattern
All pages needing nearby data use this dual-query pattern:
```tsx
const { data: bazarsRes }  = useGetBazarsQuery({ limit: 50 }, { skip: !!userLocation });
const { data: nearbyRes }  = useGetNearbyBazarsQuery(
  { lat: userLocation?.lat ?? 0, lng: userLocation?.lng ?? 0, radius: 10, limit: 50 },
  { skip: !userLocation }
);
const bazars = userLocation
  ? (nearbyRes?.data?.attributes || [])
  : (bazarsRes?.data?.attributes?.data || []);
```
The `useUserLocation` hook (`src/hooks/useUserLocation.ts`) handles geolocation + refresh.

## Bangladesh Time
Price time-slot grouping uses UTC+6 offset:
```ts
const bdHour = (new Date(dateStr).getUTCHours() + 6) % 24;
```
Slots: সকাল (5–11), দুপুর (12), বিকেল (13–16), রাত (17–4)

## Product Detail Page Logic
- **Official price**: highest-upvoted submission from today (fallback: most recent)
- **Anomaly detection**: spread > 20% with ≥3 submissions → amber warning card
- **Confidence**: `upvotes / totalVotes * 100` when `totalVotes >= 5`
- **Voting**: persisted in `localStorage` key `voted_prices` (JSON array of price IDs)

## Ranking Page
- Podium design: amber (1st), slate (2nd), orange (3rd)
- Live countdown to season end (`setInterval` + `useState`)
- Profile bottom sheet opens on user card tap
- **Streak days** = days since account creation — `memberSince` field from `/api/users/leaderboard`
- `memberDays(memberSince)` calculates `Math.floor((Date.now() - new Date(ms)) / 86400000)`

## Alerts Page
Notification-style, grouped by "আজকে" / "আগের". `NotifItem` shows emoji icon + severity dot + bazar/product tags + time ago.
Real-time updates via Socket.IO: `useSocket('alert:new', () => dispatch(invalidateTags(['Alert'])))`.

## Planner Page
Single autocomplete field (Google Maps-style bazar search):
- `bazarSearch === selectedBazarName` → show all bazars (user re-focused after picking)
- `onMouseDown` on items (fires before `onBlur`) prevents premature dropdown close
- Parent card gets `relative z-20` when dropdown open — fixes `backdrop-blur` stacking context clip

---

## Backend (`bazar-dor-backend/`)

### Tech Stack
- **Express.js** + **MongoDB** (Mongoose)
- Auth: JWT tokens
- Geospatial: 2dsphere index on `Bazar.location` for `$nearSphere` queries

### Key API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prices/home-summary` | **Home aggregation** — stats + product price changes. `?lat=&lng=&radius=` or `?bazarId=` |
| GET | `/api/bazars` | List bazars (`?search=`, `?limit=`) |
| GET | `/api/bazars/nearby` | Nearby bazars (`?lat=&lng=&radius=&limit=`) |
| GET | `/api/prices` | Raw price list (`?productId=&bazarId=&limit=`) |
| POST | `/api/prices` | Submit price (auth required) |
| POST | `/api/prices/:id/vote` | Vote up/down (auth required) |
| POST | `/api/prices/:id/stock-out` | Mark stock out (auth required) |
| GET | `/api/prices/heatmap` | Avg price per bazar (`?productId=`) |
| GET | `/api/prices/history/:productId` | 7-day daily averages (`?bazarId=`) |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Single product |
| GET | `/api/users/leaderboard` | Top 50 contributors (includes `memberSince: createdAt`) |
| GET | `/api/users/me/stats` | Auth user's own submission stats |

### `getHomeSummary` Service (price.service.ts)
1. Resolve bazar filter: `bazarId` directly OR `$nearSphere` on `Bazar` collection
2. Aggregate `Price`: `$match` last 7 days → `$sort` by upvotes desc → `$group` by productId → `$lookup` product + bazar
3. Post-process in JS: compute today's avg (last 24h), nearest prev price (24h–7d), change delta
4. Calculate 5-item essential basket totals + change
5. Return `{ stats, products }`

### Essential Basket (defined on both backend and frontend)
```ts
{ key: 'rice',    qty: 1, match: /চাল|rice/i }
{ key: 'chicken', qty: 1, match: /মুরগি|chicken/i }
{ key: 'oil',     qty: 1, match: /তেল|oil/i }
{ key: 'onion',   qty: 1, match: /পেঁয়াজ|onion/i }
{ key: 'potato',  qty: 2, match: /আলু|potato/i }
```

### Leaderboard Aggregation (user.controller.ts)
`Price.aggregate` groups by `userId`, joins `users` collection:
```ts
$project: { userId, name, totalSubmissions, verifiedSubmissions, location, memberSince: '$user.createdAt' }
```

---

## Common Patterns

### API Response Shape
Most endpoints:
```json
{ "data": { "attributes": { "data": [...], "meta": {} } } }
```
Nearby bazar endpoint (flat array):
```json
{ "data": { "attributes": [...] } }
```
Home summary endpoint:
```json
{ "data": { "attributes": { "stats": {...}, "products": [...] } } }
```

### Verified Price Badge
`upvotes / (upvotes + downvotes) >= 0.6` with at least 10 total votes.

### Next.js 15 Dynamic Route Params
`params` is now a `Promise` — page must be `async` and `await params`:
```tsx
export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return <Layout><ProductDetail productId={productId} /></Layout>;
}
```

### CSS Stacking Context (backdrop-blur + dropdown)
`backdrop-blur` creates a CSS stacking context. Child `z-50` cannot escape it.
Fix: add `relative z-20` to the containing card when the dropdown is open.

### Tailwind Mobile-first Reorder
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
  <Card className="order-1" />
  <Card className="order-2" />
  <Card className="order-4 lg:hidden" />        {/* mobile only */}
  <Card className="order-4 hidden lg:block" />  {/* desktop only, same visual slot */}
</div>
```

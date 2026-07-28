# Bazar Dor — API Documentation

> Postman-এ import/copy করার জন্য তৈরি। প্রতিটা নতুন feature/API কাজ করার সাথে সাথে এই ফাইলে নতুন সেকশন যুক্ত হবে।

**Base URL:** `{{base_url}}` → যেমন `http://localhost:5000/v1` (আপনার `.env`-এর `PORT` অনুযায়ী)

**Common Response Wrapper** (সব endpoint একই শেপ ব্যবহার করে):
```json
{
  "code": 200,
  "message": "...",
  "data": {
    "attributes": { /* actual payload এখানে থাকে */ }
  }
}
```

**Auth Header** (যেখানে লাগবে):
```
Authorization: Bearer <accessToken>
```

---

## ১. Authentication (`/auth`)

### 1.1 Register
```
POST {{base_url}}/auth/register
Content-Type: application/json
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Test@1234",
  "fullName": "Abu Sayed",
  "role": "user",
  "phone": "01700000000",
  "address": "Dhaka",
  "location": {}
}
```
- `role`: `user` | `vendor` | `admin` (default `user`)
- `phone`, `address`, `location` — optional

**Response (201):**
```json
{
  "code": 201,
  "message": "Thank you for registering. Please verify your email",
  "data": { "attributes": {} }
}
```

---

### 1.2 Login
```
POST {{base_url}}/auth/login
Content-Type: application/json
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Test@1234"
}
```
**Response (200):**
```json
{
  "code": 200,
  "message": "Login Successful",
  "data": {
    "attributes": {
      "user": { "_id": "...", "email": "...", "fullName": "...", "role": "user" },
      "tokens": {
        "access":  { "token": "<jwt>", "expires": "..." },
        "refresh": { "token": "<jwt>", "expires": "..." }
      }
    }
  }
}
```
⚠️ Login ব্যর্থ হবে যদি email verify না করা থাকে (`isEmailVerified: false`) — আগে verify-email করতে হবে।

---

### 1.3 Verify Email
```
POST {{base_url}}/auth/verify-email
Content-Type: application/json
```
**Body:**
```json
{
  "email": "user@example.com",
  "oneTimeCode": "123456"
}
```

---

### 1.4 Forgot Password
```
POST {{base_url}}/auth/forgot-password
Content-Type: application/json
```
**Body:**
```json
{ "email": "user@example.com" }
```
এটা email-এ একটা OTP (`oneTimeCode`) পাঠায়।

---

### 1.5 Reset Password
```
POST {{base_url}}/auth/reset-password
Content-Type: application/json
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "NewPass@1234"
}
```

---

### 1.6 Change Password (Auth required)
```
POST {{base_url}}/auth/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json
```
**Body:**
```json
{
  "oldPassword": "Test@1234",
  "newPassword": "NewPass@1234"
}
```

---

### 1.7 Logout
```
POST {{base_url}}/auth/logout
Content-Type: application/json
```
**Body:**
```json
{ "refreshToken": "<refreshToken>" }
```

---

### 1.8 Refresh Tokens
```
POST {{base_url}}/auth/refresh-tokens
Content-Type: application/json
```
**Body:**
```json
{ "refreshToken": "<refreshToken>" }
```

---

### 1.9 Delete My Account (Auth required)
```
POST {{base_url}}/auth/delete-me
Authorization: Bearer <accessToken>
Content-Type: application/json
```
**Body:**
```json
{ "password": "Test@1234" }
```

---

## ২. Home Page APIs

### 2.1 Home Summary (মূল aggregation)
```
GET {{base_url}}/prices/home-summary
```
**Query params (৩টি ব্যবহার-পদ্ধতি, সবগুলো optional):**

| পরিস্থিতি | Query |
|-----------|-------|
| User-এর লোকেশন আছে (নিকটবর্তী বাজার) | `?lat=23.8103&lng=90.4125&radius=10` |
| একটা নির্দিষ্ট বাজার select করা | `?bazarId=<bazar_id>` |
| লোকেশন/বাজার কোনোটাই নেই (সব পণ্য) | কোনো param নেই |

**Response (200):**
```json
{
  "code": 200,
  "message": "Home summary retrieved successfully",
  "data": {
    "attributes": {
      "stats": {
        "totalProducts": 19,
        "updatedToday": 12,
        "basketTotal": 385,
        "basketChange": -38,
        "savings": 38
      },
      "products": [
        {
          "productId": "65f1...",
          "name": "Oil",
          "nameBn": "তেল",
          "icon": "🛢",
          "image": "https://res.cloudinary.com/.../bazar-dor/products/....jpg",
          "unit": "লিটার",
          "currentPrice": 100,
          "prevPrice": 105,
          "change": -5,
          "daysAgo": 1,
          "bazarName": "কারওয়ান বাজার",
          "isVerified": true,
          "updatedToday": true
        }
      ]
    }
  }
}
```

---

### 2.2 Bazars (লোকেশন না থাকলে dropdown-এর জন্য)
```
GET {{base_url}}/bazars?limit=50
```
**Optional query:** `?search=কারওয়ান`

**Response (200):**
```json
{
  "code": 200,
  "message": "...",
  "data": {
    "attributes": {
      "data": [
        { "_id": "...", "name": "Karwan Bazar", "nameBn": "কারওয়ান বাজার", "area": "...", "lat": 23.75, "lng": 90.39 }
      ],
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "totalResults": 12
    }
  }
}
```

---

### 2.3 Nearby Bazars (লোকেশন থাকলে dropdown-এর জন্য)
```
GET {{base_url}}/bazars/nearby?lat=23.8103&lng=90.4125&radius=10&limit=50
```
**Response (200):**
```json
{
  "code": 200,
  "message": "...",
  "data": {
    "attributes": [
      { "_id": "...", "nameBn": "কারওয়ান বাজার", "lat": 23.75, "lng": 90.39, "distance": 3.2 }
    ]
  }
}
```
⚠️ এটা flat array — `attributes` সরাসরি array, `attributes.data` নয়।

---

### 2.4 Alerts (Top banner-এর জন্য)
```
GET {{base_url}}/alerts?limit=5
```
**Optional query:** `?bazarId=<bazar_id>`

**Response (200):**
```json
{
  "code": 200,
  "message": "...",
  "data": {
    "attributes": {
      "data": [
        {
          "_id": "...",
          "type": "price_spike",
          "severity": "high",
          "message": "Rice price spiked",
          "messageBn": "চালের দাম বেড়েছে",
          "bazarId": { "_id": "...", "nameBn": "কারওয়ান বাজার" },
          "productId": { "_id": "...", "nameBn": "চাল" },
          "createdAt": "2026-06-22T08:00:00.000Z"
        }
      ]
    }
  }
}
```

---

## ৩. Products — Admin (`/products`)

> পণ্য তৈরি/আপডেটে এখন **icon emoji input ও defaultPrice field বাদ** — এর বদলে **image file upload** (multipart/form-data)।

### 3.1 Create Product (Auth required, multipart)
```
POST {{base_url}}/products
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```
**Form fields:**
| Field | Type | Required |
|-------|------|----------|
| `name` | text | yes |
| `nameBn` | text | yes |
| `unit` | text (`kg`,`g`,`piece`,`dozen`,`liter`,`ml`,`packet`) | yes |
| `category` | text (vegetable/fish/meat/dairy/grain/pulse/oil/spice/fruit/bakery/protein/beverage/frozen/dry_food/other) | yes |
| `image` | file (jpg/png/webp/heic, max 10MB) | optional |

**Response (201):**
```json
{
  "code": 201,
  "message": "Product created successfully",
  "data": {
    "attributes": {
      "_id": "...",
      "name": "Tomato",
      "nameBn": "টমেটো",
      "unit": "kg",
      "category": "vegetable",
      "image": "https://res.cloudinary.com/.../bazar-dor/products/....jpg",
      "icon": "🛒",
      "defaultPrice": 0,
      "isActive": true
    }
  }
}
```
> `icon`/`defaultPrice` schema-তে থেকে গেছে (default value) কিন্তু admin form থেকে আর সেট করা হয় না।

---

### 3.2 Update Product (Auth required, multipart)
```
PUT {{base_url}}/products/:productId
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```
**Form fields:** Create-এর মতই (সব optional, যেগুলো পাঠানো হবে শুধু সেগুলো update হবে)। নতুন `image` পাঠালে পুরোনো Cloudinary ছবি মুছে নতুনটা সেট হয়।

---

## ৪. Market Index — "দামের চার্ট" (`/prices/market-index`)

### 4.1 Get Market Index
```
GET {{base_url}}/prices/market-index
```
**Query params (৩টি ব্যবহার-পদ্ধতি, home-summary-এর মতই):** `?lat=&lng=&radius=` বা `?bazarId=` বা কোনো param ছাড়াই।

**Response:**
```json
{
  "code": 200,
  "message": "Market index retrieved successfully",
  "data": {
    "attributes": {
      "currentPrice": 445,
      "change": 345,
      "changePercent": 343.5,
      "trend": [
        { "label": "10 জুন", "value": 350 },
        { "label": "11 জুন", "value": 480 }
      ],
      "stats": {
        "highest": { "value": 574, "label": "11 জুন" },
        "lowest":  { "value": 74,  "label": "14 জুন" },
        "average": 226,
        "change": 345,
        "changePercent": 343.5
      },
      "insightTip": "মুরগির দাম কেজি-তে ৳10 বেড়েছে। বাজারে যাওয়ার আগে সাম্প্রতিক দাম যাচাই করে নিন।",
      "items": [
        { "key": "rice", "label": "চাল", "unit": "কেজি", "qty": 1, "currentPrice": 48, "change": 3 }
      ]
    }
  }
}
```

**লজিক (`getMarketIndex`, price.service.ts):**
1. Essential basket-এর ৫টা পণ্যের (চাল, মুরগি, তেল, পেঁয়াজ, আলু) productId regex দিয়ে বের করা
2. গত ৭ দিনের সব দাম fetch (bazar filter সহ)
3. প্রতিদিনের জন্য basket total বানানো — যেদিন কোনো দাম নেই, সেদিন bucket তৈরি হয় না
4. ৭ দিনের data থেকে highest/lowest/average/change বের করা
5. প্রতিটা item-এর আজকের দাম + আগের দামের তুলনায় change
6. সবচেয়ে বড় change-ওয়ালা item থেকে স্বয়ংক্রিয় insight tip

> Frontend chart দেখাতে কমপক্ষে ২ দিনের data লাগে (`trend.length >= 2`)। নতুন ডাটাবেসে এটা পূরণ করতে নিচের seed script ব্যবহার করুন।

### 4.2 Seed placeholder data (লোকালি টেস্ট করার জন্য)
```bash
cd bazar-dor-backend
npm run seed:market-index
```
- `Price` collection-এ `isSeed: true` ফ্ল্যাগ দিয়ে essential basket-এর ৫টা পণ্যের জন্য গত ৭ দিনের placeholder দাম ঢোকায় (কয়েকটা active বাজারে)
- **Real data এলে automatically override হয়:** `getMarketIndex` যেকোনো দিন/পণ্যের জন্য প্রথমে real (non-seed) submission আছে কিনা চেক করে — থাকলে সেটাই ব্যবহার করে, seed data ignore হয়ে যায়। তাই কোনো cleanup করার প্রয়োজন নেই।
- বারবার রান করা নিরাপদ — প্রতিবার আগের seed data মুছে নতুন করে বসায়।

---

## পরবর্তী আপডেট
নতুন feature/API নিয়ে কাজ করার সাথে সাথে এখানে নতুন সেকশন (নম্বর ৫, ৬...) যুক্ত হবে।

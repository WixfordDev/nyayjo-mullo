import mongoose from "mongoose";
import { paginate } from "./plugins";
import { PaginateResult } from "./plugins/paginate.plugin";

interface VoterEntry {
  userId: mongoose.Types.ObjectId;
  voteType: 'up' | 'down';
}

interface PriceDocument extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  bazarId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  price: number;
  visitType: "physical" | "online";
  photoUrl: string;
  note: string;
  unit: string;
  upvotes: number;
  downvotes: number;
  voters: VoterEntry[];
  confidenceScore: number;
  isVerified: boolean;
  isStockOut: boolean;
  isSeed: boolean;
  expiresAt: Date;
}

interface PriceModel extends mongoose.Model<PriceDocument> {
  paginate(filter: any, options: any): Promise<PaginateResult<PriceDocument>>;
}

const priceSchema = new mongoose.Schema<PriceDocument, PriceModel>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    bazarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bazar",
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    price: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    visitType: {
      type: String,
      enum: ["physical", "online"],
      default: "physical",
    },
    photoUrl: {
      type: String,
      default: "",
    },
    note: {
      type: String,
      default: "",
      maxlength: 100,
      trim: true,
    },
    unit: {
      type: String,
      enum: ["kg", "g", "piece", "dozen", "liter", "ml", "packet"],
      default: "kg",
    },
    upvotes: {
      type: Number,
      default: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    voters: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          voteType: { type: String, enum: ['up', 'down'], required: true },
        },
      ],
      default: [],
    },
    confidenceScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isStockOut: {
      type: Boolean,
      default: false,
    },
    // Placeholder data inserted by the market-index seed script.
    // Automatically ignored for a given day/item as soon as a real submission exists for it.
    isSeed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
    },
  },
  { timestamps: true },
);

priceSchema.plugin(paginate);

const Price = mongoose.model<PriceDocument, PriceModel>("Price", priceSchema);

export default Price;
export { PriceDocument };

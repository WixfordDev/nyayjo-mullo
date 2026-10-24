import mongoose from "mongoose";
import { paginate } from "./plugins";
import { PaginateResult } from "./plugins/paginate.plugin";

interface ShoppingListItem {
  productId: mongoose.Types.ObjectId;
  qty: number;
  unit: string;
  estimatedPrice: number;
  actualPrice: number | null;
  isPurchased: boolean;
}

interface BazarComparisonEntry {
  bazarId: mongoose.Types.ObjectId | null;
  bazarName: string;
  total: number;
  dist: number | null;
}

interface ShoppingListDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  bazarId: mongoose.Types.ObjectId;
  items: ShoppingListItem[];
  estimatedTotal: number;
  actualTotal: number | null;
  travelCost: number;
  savings: number;
  grossSaving: number;
  savingVsAvg: number;
  savingIfSwitch: number;
  isAlreadyBest: boolean;
  comparisons: BazarComparisonEntry[];
  status: "draft" | "completed";
}

interface ShoppingListModel extends mongoose.Model<ShoppingListDocument> {
  paginate(filter: any, options: any): Promise<PaginateResult<ShoppingListDocument>>;
}

const shoppingListItemSchema = new mongoose.Schema<ShoppingListItem>({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "kg" },
  estimatedPrice: { type: Number, required: true, min: 0 },
  actualPrice: { type: Number, default: null },
  isPurchased: { type: Boolean, default: false },
});

const bazarComparisonSchema = new mongoose.Schema<BazarComparisonEntry>(
  {
    bazarId: { type: mongoose.Schema.Types.ObjectId, ref: "Bazar", default: null },
    bazarName: { type: String, default: "" },
    total: { type: Number, default: 0 },
    dist: { type: Number, default: null },
  },
  { _id: false },
);

const shoppingListSchema = new mongoose.Schema<ShoppingListDocument, ShoppingListModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      default: "সাপ্তাহিক বাজার",
      trim: true,
    },
    bazarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bazar",
      required: false,
    },
    items: {
      type: [shoppingListItemSchema],
      default: [],
    },
    estimatedTotal: {
      type: Number,
      default: 0,
    },
    actualTotal: {
      type: Number,
      default: null,
    },
    travelCost: {
      type: Number,
      default: 0,
    },
    savings: {
      type: Number,
      default: 0,
    },
    grossSaving: {
      type: Number,
      default: 0,
    },
    savingVsAvg: {
      type: Number,
      default: 0,
    },
    savingIfSwitch: {
      type: Number,
      default: 0,
    },
    isAlreadyBest: {
      type: Boolean,
      default: false,
    },
    comparisons: {
      type: [bazarComparisonSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
    },
  },
  { timestamps: true },
);

shoppingListSchema.plugin(paginate);

const ShoppingList = mongoose.model<ShoppingListDocument, ShoppingListModel>(
  "ShoppingList",
  shoppingListSchema,
);

export default ShoppingList;
export { ShoppingListDocument };

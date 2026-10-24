import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { ShoppingList } from '../models';

const createShoppingList = async (data: any) => {
  const list = await ShoppingList.create(data);
  return list;
};

const queryShoppingLists = async (filter: any, options: any) => {
  const { limit = 20, page = 1 } = options;
  const count = await ShoppingList.countDocuments(filter);
  const totalPages = Math.ceil(count / limit);
  const skip = (page - 1) * limit;

  const lists = await ShoppingList.find(filter)
    .populate('bazarId', 'name nameBn area city')
    .populate('items.productId', 'name nameBn unit icon image category')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  return {
    data: lists,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    totalResults: count,
  };
};

const getShoppingListById = async (id: string) => {
  const list = await ShoppingList.findById(id)
    .populate('bazarId', 'name nameBn area city')
    .populate('items.productId', 'name nameBn unit icon image category');
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shopping list not found');
  }
  return list;
};

const updateShoppingListById = async (id: string, bodyData: any) => {
  const list = await getShoppingListById(id);
  Object.assign(list, bodyData);
  await list.save();
  return list;
};

const deleteShoppingListById = async (id: string) => {
  const list = await ShoppingList.findByIdAndDelete(id);
  if (!list) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shopping list not found');
  }
  return list;
};

export {
  createShoppingList,
  queryShoppingLists,
  getShoppingListById,
  updateShoppingListById,
  deleteShoppingListById,
};

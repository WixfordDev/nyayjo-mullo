import { Request, Response } from 'express';
import httpStatus from 'http-status';
import response from '../config/response';
import { shoppingListService } from '../services';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

const assertOwner = (list: any, userId: string) => {
  if (list.userId?.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Shopping list not found');
  }
};

const createShoppingList = catchAsync(async (req: Request, res: Response) => {
  const listData: any = {
    ...req.body,
    userId: (req as any).user._id,
  };
  const list = await shoppingListService.createShoppingList(listData);
  res.status(httpStatus.CREATED).json(
    response({
      message: 'Shopping list created successfully',
      status: 'OK',
      statusCode: httpStatus.CREATED,
      data: list,
    }),
  );
});

const getShoppingLists = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['status']);
  (filter as any).userId = (req as any).user._id;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await shoppingListService.queryShoppingLists(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: 'Shopping lists retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: result,
    }),
  );
});

const getShoppingList = catchAsync(async (req: Request, res: Response) => {
  const listId = Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId;
  const list = await shoppingListService.getShoppingListById(listId);
  assertOwner(list, (req as any).user._id);
  res.status(httpStatus.OK).json(
    response({
      message: 'Shopping list retrieved successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: list,
    }),
  );
});

const updateShoppingList = catchAsync(async (req: Request, res: Response) => {
  const listId = Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId;
  const existing = await shoppingListService.getShoppingListById(listId);
  assertOwner(existing, (req as any).user._id);
  const list = await shoppingListService.updateShoppingListById(listId, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: 'Shopping list updated successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: list,
    }),
  );
});

const deleteShoppingList = catchAsync(async (req: Request, res: Response) => {
  const listId = Array.isArray(req.params.listId) ? req.params.listId[0] : req.params.listId;
  const existing = await shoppingListService.getShoppingListById(listId);
  assertOwner(existing, (req as any).user._id);
  const list = await shoppingListService.deleteShoppingListById(listId);
  res.status(httpStatus.OK).json(
    response({
      message: 'Shopping list deleted successfully',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: list,
    }),
  );
});

export {
  createShoppingList,
  getShoppingLists,
  getShoppingList,
  updateShoppingList,
  deleteShoppingList,
};

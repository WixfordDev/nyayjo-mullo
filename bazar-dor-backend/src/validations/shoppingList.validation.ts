import Joi from 'joi';
import { objectId } from './custom.validation';

const shoppingListItem = Joi.object().keys({
  productId: Joi.string().custom(objectId).required(),
  qty: Joi.number().min(0).required(),
  unit: Joi.string().default('kg'),
  estimatedPrice: Joi.number().min(0).required(),
  actualPrice: Joi.number().min(0).allow(null),
  isPurchased: Joi.boolean().default(false),
});

const comparisonEntry = Joi.object().keys({
  bazarId: Joi.string().custom(objectId).allow(null),
  bazarName: Joi.string().allow(''),
  total: Joi.number(),
  dist: Joi.number().allow(null),
});

const createShoppingList = {
  body: Joi.object().keys({
    name: Joi.string().allow(''),
    bazarId: Joi.string().custom(objectId),
    items: Joi.array().items(shoppingListItem).default([]),
    estimatedTotal: Joi.number().min(0).default(0),
    travelCost: Joi.number().min(0).default(0),
    savings: Joi.number().default(0),
    grossSaving: Joi.number().default(0),
    savingVsAvg: Joi.number().default(0),
    savingIfSwitch: Joi.number().default(0),
    isAlreadyBest: Joi.boolean().default(false),
    comparisons: Joi.array().items(comparisonEntry).default([]),
    status: Joi.string().valid('draft', 'completed').default('draft'),
  }),
};

const getShoppingLists = {
  query: Joi.object().keys({
    status: Joi.string().valid('draft', 'completed'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getShoppingList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
};

const updateShoppingList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().allow(''),
    bazarId: Joi.string().custom(objectId),
    items: Joi.array().items(shoppingListItem),
    estimatedTotal: Joi.number().min(0),
    actualTotal: Joi.number().min(0).allow(null),
    comparisons: Joi.array().items(comparisonEntry),
    status: Joi.string().valid('draft', 'completed'),
  }).min(1),
};

const deleteShoppingList = {
  params: Joi.object().keys({
    listId: Joi.string().custom(objectId).required(),
  }),
};

export {
  createShoppingList,
  getShoppingLists,
  getShoppingList,
  updateShoppingList,
  deleteShoppingList,
};

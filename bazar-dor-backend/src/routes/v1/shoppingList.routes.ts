import express from 'express';
import * as shoppingListController from '../../controllers/shoppingList.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

// All shopping-list routes are private to the authenticated user
router.route('/')
  .get(auth('common'), shoppingListController.getShoppingLists)
  .post(auth('common'), shoppingListController.createShoppingList);

router.route('/:listId')
  .get(auth('common'), shoppingListController.getShoppingList)
  .patch(auth('common'), shoppingListController.updateShoppingList)
  .delete(auth('common'), shoppingListController.deleteShoppingList);

export default router;

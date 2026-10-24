import express from 'express';
import config from '../../config/config';
import authRoute from './auth.routes';
import userRoute from './user.routes';
import docsRoute from './docs.routes';
import taskRoute from './tasks.routes';
import productRoute from './product.routes';
import bazarRoute from './bazar.routes';
import priceRoute from './price.routes';
import alertRoute from './alert.routes';
import dailySnapshotRoute from './dailySnapshot.routes';
import shoppingListRoute from './shoppingList.routes';

const router = express.Router();

const defaultRoutes: { path: string; route: any }[] = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/tasks',
    route: taskRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/bazars',
    route: bazarRoute,
  },
  {
    path: '/prices',
    route: priceRoute,
  },
  {
    path: '/alerts',
    route: alertRoute,
  },
  {
    path: '/daily-snapshots',
    route: dailySnapshotRoute,
  },
  {
    path: '/shopping-lists',
    route: shoppingListRoute,
  },
];

const devRoutes: { path: string; route: any }[] = [
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

export default router;

import Joi from 'joi';
import { objectId } from './custom.validation';

const createBazar = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    nameBn: Joi.string().required(),
    area: Joi.string().required(),
    city: Joi.string().default('Dhaka'),
    lat: Joi.number().default(23.8103),
    lng: Joi.number().default(90.4125),
    isActive: Joi.boolean().default(true),
  }),
};

const getBazars = {
  query: Joi.object().keys({
    name: Joi.string(),
    area: Joi.string(),
    city: Joi.string(),
    isActive: Joi.boolean(),
    includeInactive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBazar = {
  params: Joi.object().keys({
    bazarId: Joi.string().custom(objectId).required(),
  }),
};

const updateBazar = {
  params: Joi.object().keys({
    bazarId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string(),
    nameBn: Joi.string(),
    area: Joi.string(),
    city: Joi.string(),
    lat: Joi.number(),
    lng: Joi.number(),
    isActive: Joi.boolean(),
  }),
};

const deleteBazar = {
  params: Joi.object().keys({
    bazarId: Joi.string().custom(objectId).required(),
  }),
};

export { createBazar, getBazars, getBazar, updateBazar, deleteBazar };

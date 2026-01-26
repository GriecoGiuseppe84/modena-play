import Joi from 'joi';

export const schemas = {
  adminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  setupConfig: Joi.object({
    appName: Joi.string().min(2).max(64).required(),
    adminEmail: Joi.string().email().required(),
    currency: Joi.string().valid('EUR', 'USD', 'GBP').required(),
    timezone: Joi.string().required(),
    maxClickthroughPerDay: Joi.number().integer().min(10).max(100000).required(),
  }),
  affiliateLinkCreate: Joi.object({
    title: Joi.string().min(2).max(120).required(),
    source_url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    destination_url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    category: Joi.string().min(2).max(64).required(),
    commission_rate: Joi.number().min(0).max(1).required(),
    status: Joi.string().valid('active', 'paused', 'archived').required(),
  }),
  affiliateLinkUpdate: Joi.object({
    title: Joi.string().min(2).max(120).optional(),
    source_url: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
    destination_url: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
    category: Joi.string().min(2).max(64).optional(),
    commission_rate: Joi.number().min(0).max(1).optional(),
    status: Joi.string().valid('active', 'paused', 'archived').optional(),
  }).min(1),
  analyticsRange: Joi.object({
    from: Joi.string().isoDate().required(),
    to: Joi.string().isoDate().required(),
  }),
};

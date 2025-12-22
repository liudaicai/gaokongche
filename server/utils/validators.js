import Joi from 'joi';

/**
 * 验证请求数据
 * @param {Object} schema - Joi 验证模式
 * @returns {Function} Express 中间件
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    req.validatedData = value;
    next();
  };
}

/**
 * 通用验证规则
 */
export const commonSchemas = {
  id: Joi.number().integer().positive(),
  name: Joi.string().min(1).max(255).trim(),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(7).max(20),
  date: Joi.date().iso(),
  password: Joi.string().min(8).max(100),
};

/**
 * 登录验证
 */
export const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(50).trim(),
  password: Joi.string().required().min(6).max(100),
});

/**
 * 客户验证
 */
export const customerSchema = Joi.object({
  name: commonSchemas.name.required(),
  contact: Joi.string().max(255).trim().allow('', null),
  phone: commonSchemas.phone.allow('', null),
  address: Joi.string().max(500).trim().allow('', null),
});

/**
 * 员工验证
 */
export const employeeSchema = Joi.object({
  name: commonSchemas.name.required(),
  role: Joi.string().max(100).trim().allow('', null),
  email: commonSchemas.email.allow('', null),
  phone: commonSchemas.phone.allow('', null),
});

/**
 * 订单验证
 */
export const orderSchema = Joi.object({
  contract_number: Joi.string().max(50).trim().allow('', null),
  lessor_id: commonSchemas.id.allow(null),
  customer_id: commonSchemas.id.allow(null),
  project_name: Joi.string().max(255).trim().allow('', null),
  business_manager_id: commonSchemas.id.allow(null),
  delivery_location: Joi.string().max(255).trim().allow('', null),
  payment_agreement: Joi.string().max(255).trim().allow('', null),
  month_calculation_method: Joi.string().max(100).trim().allow('', null),
});

/**
 * 分页参数验证
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().trim().allow('', null),
  order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

/**
 * 验证分页查询参数
 */
export function validatePagination(req, res, next) {
  const { error, value } = paginationSchema.validate(req.query, {
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid pagination parameters',
      details: error.details.map(d => d.message),
    });
  }

  req.pagination = value;
  next();
}


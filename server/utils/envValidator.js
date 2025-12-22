import Joi from 'joi';

/**
 * 环境变量验证模式
 */
const envSchema = Joi.object({
  // 数据库配置
  MYSQL_HOST: Joi.string().default('127.0.0.1'),
  MYSQL_PORT: Joi.number().port().default(3306),
  MYSQL_USER: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().allow('').when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(8).required(),
    otherwise: Joi.string().allow(''),
  }),
  MYSQL_DB: Joi.string().required(),

  // 服务器配置
  API_PORT: Joi.number().port().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // JWT 配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // 安全配置
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // CORS 配置
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:5173'),

  // Redis 配置（可选）
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),

  // 日志配置
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_DIR: Joi.string().default('./logs'),
}).unknown(true); // 允许其他环境变量

/**
 * 验证环境变量
 * @throws {Error} 如果验证失败
 */
export function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details.map(detail => {
      return `${detail.path.join('.')}: ${detail.message}`;
    });

    console.error('❌ Environment validation failed:');
    errorMessages.forEach(msg => console.error(`  - ${msg}`));
    
    throw new Error('Invalid environment configuration');
  }

  // 在生产环境进行额外的安全检查
  if (value.NODE_ENV === 'production') {
    if (value.JWT_SECRET === 'your_jwt_secret_key_change_in_production_min_32_chars') {
      throw new Error('SECURITY: Please change JWT_SECRET in production!');
    }
    
    if (!value.MYSQL_PASSWORD || value.MYSQL_PASSWORD.length < 8) {
      throw new Error('SECURITY: Strong MYSQL_PASSWORD is required in production!');
    }
  }

  console.log('✅ Environment validation passed');
  return value;
}


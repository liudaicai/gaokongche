// 环境变量配置和验证
import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

// 定义环境变量schema
const envSchema = Joi.object({
  // 数据库配置
  MYSQL_HOST: Joi.string().default('127.0.0.1'),
  MYSQL_PORT: Joi.number().default(3306),
  MYSQL_USER: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().allow('').default(''),
  MYSQL_DB: Joi.string().required(),
  
  // API配置
  API_PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  
  // JWT配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // CORS配置
  CORS_ORIGINS: Joi.string().default('http://localhost:5173,http://localhost:5174'),
  
  // 上传配置
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_DIR: Joi.string().default('./server/uploads'),
  
  // 日志配置
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown(true); // 允许其他环境变量

// 验证环境变量
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// 导出配置对象
export const config = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isDevelopment: envVars.NODE_ENV === 'development',
  
  api: {
    port: envVars.API_PORT,
  },
  
  db: {
    host: envVars.MYSQL_HOST,
    port: envVars.MYSQL_PORT,
    user: envVars.MYSQL_USER,
    password: envVars.MYSQL_PASSWORD,
    database: envVars.MYSQL_DB,
    // 优化的连接池配置
    connectionLimit: envVars.NODE_ENV === 'production' ? 50 : 10,
    queueLimit: 100,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },
  
  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map(o => o.trim()),
  },
  
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    uploadDir: envVars.UPLOAD_DIR,
  },
  
  log: {
    level: envVars.LOG_LEVEL,
  },
};

export default config;

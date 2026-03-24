// Безопасная конфигурация приложения с обязательными переменными окружения

const crypto = require('crypto');

// Функция проверки обязательных переменных окружения
function requireEnv(varName) {
  const value = process.env[varName];
  if (!value) {
    throw new Error(
      `🔴 КРИТИЧЕСКАЯ ОШИБКА: Переменная окружения ${varName} не установлена!\n` +
      `Пожалуйста, создайте файл .env на основе .env.example и заполните все обязательные поля.`
    );
  }
  return value;
}

// Функция генерации случайного секрета (для development)
function generateSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Проверка режима работы
const isDevelopment = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';

// В production секреты обязательны!
let jwtSecret, sessionSecret;

if (isProduction) {
  jwtSecret = requireEnv('JWT_SECRET');
  sessionSecret = requireEnv('SESSION_SECRET');
  
  // Дополнительная проверка длины секретов
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET слишком короткий! Минимум 32 символа.');
  }
  if (sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET слишком короткий! Минимум 32 символа.');
  }
} else {
  // В development можем сгенерировать, но предупреждаем
  jwtSecret = process.env.JWT_SECRET || generateSecret();
  sessionSecret = process.env.SESSION_SECRET || generateSecret();
  
  if (!process.env.JWT_SECRET || !process.env.SESSION_SECRET) {
    console.warn('⚠️  ПРЕДУПРЕЖДЕНИЕ: Используются автоматически сгенерированные секреты!');
    console.warn('⚠️  Для production создайте .env файл с реальными секретами.');
    console.warn('⚠️  Сгенерировать секреты: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  }
}

module.exports = {
  // Настройки сервера
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    isDevelopment,
    isProduction
  },

  // Настройки базы данных
  database: {
    path: process.env.DB_PATH || './database/college.db',
    // Для production рекомендуется PostgreSQL
    type: process.env.DB_TYPE || 'sqlite',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },

  // JWT настройки
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Настройки сессий
  session: {
    secret: sessionSecret,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 часа
    secure: isProduction, // true только в production
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    name: 'college_sid' // Кастомное имя сессии
  },

  // Настройки CORS
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : (isDevelopment ? ['http://localhost:3000', 'http://localhost:8080'] : []),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400 // 24 hours
  },

  // Настройки загрузки файлов
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.rar', '.mp4', '.avi', '.jpg', '.jpeg', '.png'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-rar-compressed',
      'video/mp4',
      'video/x-msvideo',
      'image/jpeg',
      'image/png'
    ]
  },

  // Настройки безопасности
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
    requireStrongPasswords: process.env.REQUIRE_STRONG_PASSWORDS !== 'false',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableCSRFProtection: process.env.ENABLE_CSRF_PROTECTION !== 'false',
    
    // Rate limiting настройки
    rateLimit: {
      // Для аутентификации
      auth: {
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 5, // 5 попыток
        message: 'Слишком много попыток входа. Попробуйте позже.'
      },
      // Для API
      api: {
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 100, // 100 запросов
        message: 'Слишком много запросов. Попробуйте позже.'
      },
      // Для критичных операций
      strict: {
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 10, // 10 запросов
        message: 'Превышен лимит запросов. Попробуйте позже.'
      }
    },
    
    // Блокировка IP
    maxFailedAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 минут
    
    // Helmet настройки
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null
        }
      },
      hsts: {
        maxAge: 31536000, // 1 год
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true
    }
  },

  // Настройки логирования
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    file: process.env.LOG_FILE || './logs/application.log',
    maxSize: '20m',
    maxFiles: '14d',
    
    // Что логировать
    logRequests: true,
    logErrors: true,
    logSecurity: true,
    logDatabase: isDevelopment
  },

  // Email настройки (опционально)
  email: {
    enabled: process.env.SMTP_HOST ? true : false,
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@college.ru',
    templates: {
      welcome: 'templates/email/welcome.html',
      passwordReset: 'templates/email/password-reset.html',
      notification: 'templates/email/notification.html'
    }
  },

  // Двухфакторная аутентификация
  twoFactor: {
    enabled: process.env['2FA_ENABLED'] === 'true',
    issuer: process.env['2FA_ISSUER'] || 'College System',
    window: 1 // Допустимое отклонение по времени
  },

  // Backup настройки
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    path: process.env.BACKUP_PATH || './backups',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Каждый день в 2:00
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    compression: true,
    encryption: true
  }
};

// Логируем конфигурацию при запуске (без секретов!)
if (isDevelopment) {
  console.log('📋 Конфигурация загружена:');
  console.log('  • Режим:', module.exports.server.env);
  console.log('  • Порт:', module.exports.server.port);
  console.log('  • База данных:', module.exports.database.type);
  console.log('  • CORS origins:', module.exports.cors.origin.join(', '));
  console.log('  • Rate limiting:', module.exports.security.enableRateLimiting ? '✅' : '❌');
  console.log('  • CSRF защита:', module.exports.security.enableCSRFProtection ? '✅' : '❌');
  console.log('  • Логирование:', module.exports.logging.level);
}


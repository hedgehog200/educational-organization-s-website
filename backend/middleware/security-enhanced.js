// Улучшенный security middleware для максимальной защиты
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');

// ============================================
// RATE LIMITING
// ============================================

const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Используем IP из заголовков для работы за proxy
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    // Пропускаем successful requests в подсчете для некоторых эндпоинтов
    skipSuccessfulRequests: false,
    // Handler для превышения лимита
    handler: (req, res) => {
      console.log(`[SECURITY] Rate limit exceeded: ${req.ip} - ${req.path}`);
      res.status(429).json({
        success: false,
        message: message
      });
    }
  });
};

// Строгий лимит для аутентификации
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 минут
  5, // 5 попыток
  'Слишком много попыток входа. Попробуйте через 15 минут.'
);

// Общий лимит для API
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 минут
  100, // 100 запросов
  'Слишком много запросов. Попробуйте позже.'
);

// Строгий лимит для критичных операций (админка, изменение данных)
const strictLimiter = createRateLimit(
  15 * 60 * 1000, // 15 минут
  20, // 20 запросов
  'Превышен лимит запросов для данной операции.'
);

// Очень строгий лимит для изменения паролей
const passwordLimiter = createRateLimit(
  60 * 60 * 1000, // 1 час
  3, // 3 попытки
  'Слишком много попыток смены пароля. Попробуйте через час.'
);

// ============================================
// HELMET - SECURITY HEADERS
// ============================================

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      upgradeInsecureRequests: config.server.isProduction ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true
  },
  // Предотвращение MIME sniffing
  noSniff: true,
  // XSS фильтр
  xssFilter: true,
  // Скрываем информацию о сервере
  hidePoweredBy: true,
  // Предотвращение clickjacking
  frameguard: {
    action: 'deny'
  },
  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

// Проверка JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Проверяем сессию как fallback
    if (req.session && req.session.userId) {
      req.user = {
        userId: req.session.userId,
        email: req.session.userEmail,
        role: req.session.userRole
      };
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: 'Токен доступа не предоставлен'
    });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      console.log(`[SECURITY] Invalid token attempt: ${err.message}`);
      return res.status(403).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
    req.user = user;
    next();
  });
};

// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================

// Проверка ролей
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не аутентифицирован'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`[SECURITY] Unauthorized access attempt: User ${req.user.userId} (Role: ${req.user.role}) tried to access ${req.path}`);
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав доступа'
      });
    }

    next();
  };
};

// Только для админов
const requireAdmin = [authenticateToken, authorize('admin')];

// Только для преподавателей и админов
const requireTeacherOrAdmin = [authenticateToken, authorize('teacher', 'admin')];

// Для всех аутентифицированных
const requireAuth = authenticateToken;

// ============================================
// INPUT VALIDATION
// ============================================

// Middleware для обработки результатов валидации
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`[SECURITY] Validation failed for ${req.path}:`, errors.array());
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: errors.array()
    });
  }
  next();
};

// Санитизация строк (защита от XSS)
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '') // Удаляем < и >
    .trim();
};

// Middleware для санитизации тела запроса
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
};

// ============================================
// SECURITY LOGGING
// ============================================

const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const userId = req.user?.userId || req.session?.userId || 'anonymous';
  
  // Логируем все запросы в development
  if (config.server.isDevelopment) {
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip} - User: ${userId}`);
  }
  
  // Логируем критичные операции всегда
  const criticalPaths = ['/api/auth/login', '/api/auth/register', '/api/admin', '/api/change-password'];
  const isCritical = criticalPaths.some(path => req.path.startsWith(path));
  
  if (isCritical) {
    console.log(`[SECURITY] Critical operation: ${req.method} ${req.path} - IP: ${ip} - User: ${userId} - UA: ${userAgent}`);
  }
  
  // Логируем подозрительные заголовки
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) {
      console.log(`[SECURITY] Suspicious header detected: ${header}=${req.headers[header]} from IP: ${ip}`);
    }
  });
  
  next();
};

// ============================================
// REQUEST SIZE LIMITING
// ============================================

const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    
    if (contentLength > parseSize(maxSize)) {
      console.log(`[SECURITY] Request too large: ${contentLength} bytes from ${req.ip}`);
      return res.status(413).json({
        success: false,
        message: 'Размер запроса превышает допустимый лимит'
      });
    }
    
    next();
  };
};

// Вспомогательная функция для парсинга размера
function parseSize(size) {
  if (typeof size === 'number') return size;
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // По умолчанию 10MB
  return parseInt(match[1]) * units[match[2]];
}

// ============================================
// CSRF PROTECTION
// ============================================

// Простая CSRF защита без cookie (для API с JWT)
const csrfProtection = (req, res, next) => {
  // Пропускаем GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Проверяем заголовок X-CSRF-Token или используем JWT токен как CSRF токен
  const csrfToken = req.headers['x-csrf-token'];
  const authToken = req.headers['authorization'];

  if (!csrfToken && !authToken) {
    console.log(`[SECURITY] CSRF protection triggered for ${req.path} from ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'CSRF токен отсутствует'
    });
  }

  next();
};

// ============================================
// IP BLACKLIST
// ============================================

const blacklistedIPs = new Set();
const failedAttempts = new Map();

const blacklistCheck = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (blacklistedIPs.has(ip)) {
    console.log(`[SECURITY] Blocked request from blacklisted IP: ${ip}`);
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен'
    });
  }
  
  next();
};

// Функция для добавления IP в черный список
const addToBlacklist = (ip, duration = 30 * 60 * 1000) => {
  blacklistedIPs.add(ip);
  console.log(`[SECURITY] IP ${ip} added to blacklist for ${duration}ms`);
  
  setTimeout(() => {
    blacklistedIPs.delete(ip);
    console.log(`[SECURITY] IP ${ip} removed from blacklist`);
  }, duration);
};

// Отслеживание неудачных попыток
const trackFailedAttempt = (ip) => {
  const attempts = failedAttempts.get(ip) || 0;
  const newAttempts = attempts + 1;
  
  failedAttempts.set(ip, newAttempts);
  
  // Если больше 10 неудачных попыток за короткое время - блокируем
  if (newAttempts >= 10) {
    addToBlacklist(ip, 60 * 60 * 1000); // Блокируем на час
    failedAttempts.delete(ip);
  }
  
  // Сбрасываем счетчик через 15 минут
  setTimeout(() => {
    failedAttempts.delete(ip);
  }, 15 * 60 * 1000);
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Rate limiting
  authLimiter,
  apiLimiter,
  strictLimiter,
  passwordLimiter,
  
  // Security headers
  securityHeaders,
  
  // Authentication & Authorization
  authenticateToken,
  authorize,
  requireAdmin,
  requireTeacherOrAdmin,
  requireAuth,
  
  // Validation
  validateInput,
  sanitizeBody,
  
  // Logging
  securityLogger,
  
  // Size limiting
  requestSizeLimiter,
  
  // CSRF
  csrfProtection,
  
  // Blacklist
  blacklistCheck,
  addToBlacklist,
  trackFailedAttempt
};


// Security middleware for enhanced protection
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    handler: (req, res) => {
      console.log(`[SECURITY] Rate limit exceeded: ${req.ip} - ${req.path}`);
      res.status(429).json({
        success: false,
        message: message
      });
    }
  });
};

// Different rate limits for different endpoints
// В режиме разработки используем более мягкие лимиты
const isDevelopment = process.env.NODE_ENV !== 'production';

const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 50 : 5, // 50 попыток в dev, 5 в prod
  'Слишком много попыток входа. Попробуйте через 15 минут.'
);

const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 500 : 100, // 500 запросов в dev, 100 в prod
  'Слишком много запросов. Попробуйте позже.'
);

const strictLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 100 : 20, // 100 запросов в dev, 20 в prod
  'Превышен лимит запросов для данной операции.'
);

const passwordLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  isDevelopment ? 20 : 3, // 20 попыток в dev, 3 в prod
  'Слишком много попыток смены пароля. Попробуйте через час.'
);

// Security headers с поддержкой Font Awesome и модальных окон
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Разрешаем inline стили для модальных окон и Font Awesome CDN
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",  // Для inline стилей в модальных окнах
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"  // Для Font Awesome
      ],
      // Разрешаем шрифты с Google Fonts и Font Awesome
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com", 
        "https://cdnjs.cloudflare.com",  // Для Font Awesome шрифтов
        "data:"
      ],
      // Разрешаем inline скрипты (для onclick и т.д.)
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",  // Для inline скриптов
        "https://cdnjs.cloudflare.com"  // Если используются скрипты с CDN
      ],
      // Разрешаем inline event handlers (onclick, onchange и т.д.)
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      // Отключаем upgradeInsecureRequests в development для работы на localhost
      upgradeInsecureRequests: config.server.isProduction ? [] : null
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: {
    action: 'deny'
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Input validation middleware
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
    .replace(/[<>]/g, '')
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

// Authentication middleware
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

// Role-based authorization
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

// Logging middleware
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
  
  next();
};

// IP Blacklist
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

// Request size limiter
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      console.log(`[SECURITY] Request too large: ${contentLength} bytes from ${req.ip}`);
      return res.status(413).json({
        success: false,
        message: 'Размер запроса превышает допустимый лимит'
      });
    }
    
    next();
  };
};

function parseSize(size) {
  if (typeof size === 'number') return size;
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024;
  return parseInt(match[1]) * units[match[2]];
}

module.exports = {
  authLimiter,
  apiLimiter,
  strictLimiter,
  passwordLimiter,
  securityHeaders,
  csrfProtection,
  validateInput,
  sanitizeBody,
  authenticateToken,
  authorize,
  requireAdmin,
  requireTeacherOrAdmin,
  requireAuth,
  securityLogger,
  blacklistCheck,
  requestSizeLimiter
};

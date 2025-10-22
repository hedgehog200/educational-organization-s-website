// Конфигурация приложения
module.exports = {
  // Настройки сервера
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // Настройки базы данных
  database: {
    path: process.env.DB_PATH || './database/college.db'
  },

  // JWT настройки
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '24h'
  },

  // Настройки сессий
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  },

  // Настройки CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
  },

  // Настройки загрузки файлов
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedTypes: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.rar', '.mp4', '.avi']
  },

  // Настройки безопасности
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10
  },

  // Настройки логирования
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

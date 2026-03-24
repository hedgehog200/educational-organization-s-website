// Простая система логирования для безопасности
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

// Создать директорию логов, если не существует
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Форматирование даты
function formatDate() {
  return new Date().toISOString();
}

// Получить имя файла лога для текущей даты
function getLogFileName(level) {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `${level}-${date}.log`);
}

// Основная функция логирования
function log(level, message, data = {}) {
  const timestamp = formatDate();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data
  };
  
  // Логировать в консоль (всегда)
  const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (level === 'error') {
    console.error(consoleMessage, data);
  } else if (level === 'warn') {
    console.warn(consoleMessage, data);
  } else {
    console.log(consoleMessage, data);
  }
  
  // Логировать в файл
  try {
    const logFile = getLogFileName(level);
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (error) {
    console.error('Ошибка записи в лог-файл:', error);
  }
}

// Экспорт функций логирования
module.exports = {
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data),
  security: (message, data) => log('security', message, data),
  
  // Для обратной совместимости
  log: (level, message, data) => log(level, message, data)
};


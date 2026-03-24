#!/usr/bin/env node

/**
 * Генератор безопасных секретных ключей для проекта
 * Использование: node generate-secrets.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Функция для генерации случайного секрета
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Функция для генерации .env файла
function generateEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  
  // Проверяем, существует ли уже .env файл
  if (fs.existsSync(envPath)) {
    console.log(`${colors.yellow}⚠️  Файл .env уже существует!${colors.reset}`);
    console.log(`${colors.yellow}   Если вы хотите перегенерировать секреты, удалите файл вручную.${colors.reset}`);
    return false;
  }

  // Генерируем секреты
  const jwtSecret = generateSecret(64);
  const sessionSecret = generateSecret(64);
  const adminPassword = generateSecret(16);

  // Создаем содержимое .env файла
  const envContent = `# ===========================================
# КРИТИЧЕСКИ ВАЖНО: БЕЗОПАСНОСТЬ
# ===========================================
# Этот файл сгенерирован автоматически
# НИКОГДА не коммитьте этот файл в git!
# Создан: ${new Date().toISOString()}

# Секретный ключ для JWT токенов
JWT_SECRET=${jwtSecret}

# Секретный ключ для сессий
SESSION_SECRET=${sessionSecret}

# ===========================================
# ОКРУЖЕНИЕ
# ===========================================
NODE_ENV=development
PORT=3000

# ===========================================
# БАЗА ДАННЫХ
# ===========================================
DB_PATH=./database/college.db

# ===========================================
# CORS
# ===========================================
CORS_ORIGIN=http://localhost:3000,http://localhost:8080

# ===========================================
# БЕЗОПАСНОСТЬ
# ===========================================
BCRYPT_ROUNDS=10
PASSWORD_MIN_LENGTH=12
REQUIRE_STRONG_PASSWORDS=true
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true

# ===========================================
# ЗАГРУЗКА ФАЙЛОВ
# ===========================================
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads

# ===========================================
# ЛОГИРОВАНИЕ
# ===========================================
LOG_LEVEL=info
LOG_FILE=./logs/application.log

# ===========================================
# АДМИНИСТРАТОР ПО УМОЛЧАНИЮ
# ===========================================
# Используйте этот пароль для первого входа
# ОБЯЗАТЕЛЬНО смените его после первого входа!
DEFAULT_ADMIN_PASSWORD=${adminPassword}
`;

  // Записываем файл
  try {
    fs.writeFileSync(envPath, envContent, { encoding: 'utf8', mode: 0o600 });
    return { jwtSecret, sessionSecret, adminPassword };
  } catch (error) {
    console.error(`${colors.red}❌ Ошибка при создании .env файла:${colors.reset}`, error.message);
    return false;
  }
}

// Функция для создания директорий
function createDirectories() {
  const dirs = [
    path.join(__dirname, '../database'),
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../backups')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        console.log(`${colors.green}✅ Создана директория: ${dir}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}❌ Ошибка при создании директории ${dir}:${colors.reset}`, error.message);
      }
    }
  });
}

// Функция для создания .gitignore записей
function updateGitignore() {
  const gitignorePath = path.join(__dirname, '../../.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    console.log(`${colors.yellow}⚠️  .gitignore не найден${colors.reset}`);
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');
  
  // Проверяем, есть ли уже нужные записи
  const requiredEntries = ['.env', '*.db', 'uploads/', 'logs/', 'backups/'];
  const missingEntries = requiredEntries.filter(entry => !content.includes(entry));
  
  if (missingEntries.length === 0) {
    console.log(`${colors.green}✅ .gitignore уже содержит необходимые записи${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}ℹ️  Добавьте следующие строки в .gitignore:${colors.reset}`);
  missingEntries.forEach(entry => {
    console.log(`   ${entry}`);
  });
}

// Главная функция
function main() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   Генератор безопасных секретных ключей${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);

  // Создаем необходимые директории
  console.log(`${colors.bright}Шаг 1: Создание директорий...${colors.reset}`);
  createDirectories();

  // Генерируем .env файл
  console.log(`\n${colors.bright}Шаг 2: Генерация .env файла...${colors.reset}`);
  const result = generateEnvFile();

  if (result) {
    console.log(`${colors.green}✅ Файл .env успешно создан!${colors.reset}\n`);
    
    console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}   ВАЖНАЯ ИНФОРМАЦИЯ${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.bright}📝 Дефолтный пароль администратора:${colors.reset}`);
    console.log(`   ${colors.green}${result.adminPassword}${colors.reset}\n`);
    
    console.log(`${colors.bright}🔐 Ваши секретные ключи (не делитесь ими!):${colors.reset}`);
    console.log(`   JWT_SECRET: ${result.jwtSecret.substring(0, 20)}...`);
    console.log(`   SESSION_SECRET: ${result.sessionSecret.substring(0, 20)}...`);
    
    console.log(`\n${colors.red}${colors.bright}⚠️  КРИТИЧЕСКИ ВАЖНО:${colors.reset}`);
    console.log(`${colors.red}   1. Сохраните дефолтный пароль администратора${colors.reset}`);
    console.log(`${colors.red}   2. Смените его сразу после первого входа${colors.reset}`);
    console.log(`${colors.red}   3. НИКОГДА не коммитьте .env файл в git${colors.reset}`);
    console.log(`${colors.red}   4. Используйте эти секреты только для development${colors.reset}`);
    console.log(`${colors.red}   5. Для production генерируйте новые секреты${colors.reset}\n`);
  }

  // Проверяем .gitignore
  console.log(`${colors.bright}Шаг 3: Проверка .gitignore...${colors.reset}`);
  updateGitignore();

  console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.green}   Настройка завершена!${colors.reset}`);
  console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.bright}Следующие шаги:${colors.reset}`);
  console.log(`   1. Проверьте файл .env и настройте параметры по необходимости`);
  console.log(`   2. Запустите сервер: npm start`);
  console.log(`   3. Войдите как администратор и смените пароль`);
  console.log(`   4. Настройте CORS для вашего домена в production\n`);
}

// Запуск
main();


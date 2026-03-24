#!/usr/bin/env node

/**
 * Скрипт проверки безопасности проекта
 * Проверяет наличие критичных уязвимостей
 */

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

// Счетчики
let passedChecks = 0;
let failedChecks = 0;
let warningChecks = 0;

function printHeader() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   Проверка безопасности College System${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`);
}

function printResult(checkName, passed, message = '', isWarning = false) {
  const icon = passed ? '✅' : (isWarning ? '⚠️ ' : '❌');
  const color = passed ? colors.green : (isWarning ? colors.yellow : colors.red);
  
  console.log(`${color}${icon} ${checkName}${colors.reset}`);
  if (message) {
    console.log(`   ${message}`);
  }
  
  if (passed) passedChecks++;
  else if (isWarning) warningChecks++;
  else failedChecks++;
}

// Проверка 1: .env файл существует
function checkEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  const exists = fs.existsSync(envPath);
  
  if (!exists) {
    printResult(
      'Файл .env',
      false,
      'Файл .env не найден! Запустите: node scripts/generate-secrets.js'
    );
    return false;
  }
  
  printResult('Файл .env', true, 'Файл существует');
  return true;
}

// Проверка 2: .env в .gitignore
function checkGitignore() {
  const gitignorePath = path.join(__dirname, '../../.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    printResult('.gitignore', false, 'Файл .gitignore не найден!', true);
    return false;
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const hasEnv = content.includes('.env');
  const hasDb = content.includes('*.db') || content.includes('.db');
  
  if (!hasEnv) {
    printResult('.gitignore (.env)', false, '.env не добавлен в .gitignore!');
    return false;
  }
  
  if (!hasDb) {
    printResult('.gitignore (*.db)', false, 'База данных не защищена в .gitignore!', true);
  }
  
  printResult('.gitignore', true, 'Чувствительные файлы защищены');
  return true;
}

// Проверка 3: Секретные ключи не дефолтные
function checkSecrets() {
  const envPath = path.join(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    return false;
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  
  // Проверяем JWT_SECRET
  const jwtMatch = content.match(/JWT_SECRET=(.+)/);
  if (!jwtMatch || jwtMatch[1].trim() === '' || jwtMatch[1].length < 32) {
    printResult('JWT_SECRET', false, 'JWT_SECRET слишком короткий или пустой!');
    return false;
  }
  
  // Проверяем SESSION_SECRET
  const sessionMatch = content.match(/SESSION_SECRET=(.+)/);
  if (!sessionMatch || sessionMatch[1].trim() === '' || sessionMatch[1].length < 32) {
    printResult('SESSION_SECRET', false, 'SESSION_SECRET слишком короткий или пустой!');
    return false;
  }
  
  printResult('Секретные ключи', true, 'Ключи установлены и достаточно длинные');
  return true;
}

// Проверка 4: config.js не содержит хардкодированных секретов
function checkConfigFile() {
  const configPath = path.join(__dirname, '../config.js');
  
  if (!fs.existsSync(configPath)) {
    printResult('config.js', false, 'Файл config.js не найден!', true);
    return false;
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  // Ищем подозрительные паттерны
  const suspiciousPatterns = [
    /secret:\s*['"](?!process\.env)[^'"]{10,}['"]/,
    /password:\s*['"][^'"]+['"]/,
    /your-super-secret/i,
    /change-in-production/i
  ];
  
  let foundIssues = [];
  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      foundIssues.push(pattern.toString());
    }
  });
  
  if (foundIssues.length > 0) {
    printResult(
      'config.js',
      false,
      `Обнаружены хардкодированные секреты! Используйте process.env`
    );
    return false;
  }
  
  printResult('config.js', true, 'Не содержит хардкодированных секретов');
  return true;
}

// Проверка 5: База данных защищена
function checkDatabase() {
  const dbPath = path.join(__dirname, '../database/college.db');
  
  if (!fs.existsSync(dbPath)) {
    printResult('База данных', true, 'База данных еще не создана', true);
    return true;
  }
  
  // Проверяем права доступа к файлу
  try {
    const stats = fs.statSync(dbPath);
    
    // Проверка для Windows
    if (process.platform === 'win32') {
      // В Windows проверяем только наличие файла и его доступность
      try {
        fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
        printResult('База данных (права)', true, 'Файл доступен для чтения/записи');
      } catch (error) {
        printResult('База данных (права)', false, 'Проблемы с доступом к файлу', true);
      }
    } else {
      // Проверка для Unix/Linux
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      
      if (mode === '600' || mode === '644') {
        printResult('База данных (права)', true, `Права доступа: ${mode}`);
      } else {
        printResult(
          'База данных (права)',
          false,
          `Небезопасные права доступа: ${mode}. Рекомендуется 600 или 644`,
          true
        );
      }
    }
  } catch (error) {
    printResult('База данных (права)', false, 'Не удалось проверить права доступа', true);
  }
  
  return true;
}

// Проверка 6: package.json - уязвимые зависимости
function checkDependencies() {
  const packagePath = path.join(__dirname, '../package.json');
  
  if (!fs.existsSync(packagePath)) {
    printResult('package.json', false, 'Файл package.json не найден!');
    return false;
  }
  
  printResult(
    'Зависимости',
    true,
    'Запустите "npm audit" для проверки уязвимостей',
    true
  );
  
  return true;
}

// Проверка 7: Наличие middleware безопасности
function checkSecurityMiddleware() {
  const middlewarePath = path.join(__dirname, '../middleware/security.js');
  const middlewareEnhancedPath = path.join(__dirname, '../middleware/security-enhanced.js');
  
  const exists = fs.existsSync(middlewarePath) || fs.existsSync(middlewareEnhancedPath);
  
  if (!exists) {
    printResult('Security Middleware', false, 'Файл security middleware не найден!');
    return false;
  }
  
  printResult('Security Middleware', true, 'Security middleware найден');
  return true;
}

// Проверка 8: server.js использует security middleware
function checkServerConfig() {
  const serverPath = path.join(__dirname, '../server.js');
  
  if (!fs.existsSync(serverPath)) {
    printResult('server.js', false, 'Файл server.js не найден!');
    return false;
  }
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Проверяем использование security middleware
  const hasHelmet = content.includes('helmet') || content.includes('securityHeaders');
  const hasRateLimit = content.includes('rateLimit') || content.includes('Limiter');
  
  if (!hasHelmet) {
    printResult(
      'Helmet headers',
      false,
      'Helmet не подключен в server.js!',
      true
    );
  } else {
    printResult('Helmet headers', true, 'Helmet подключен');
  }
  
  if (!hasRateLimit) {
    printResult(
      'Rate Limiting',
      false,
      'Rate limiting не подключен в server.js!',
      true
    );
  } else {
    printResult('Rate Limiting', true, 'Rate limiting подключен');
  }
  
  return hasHelmet && hasRateLimit;
}

// Проверка 9: Директории существуют
function checkDirectories() {
  const dirs = [
    { path: '../uploads', name: 'uploads' },
    { path: '../logs', name: 'logs' },
    { path: '../database', name: 'database' }
  ];
  
  let allExist = true;
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir.path);
    const exists = fs.existsSync(fullPath);
    
    if (!exists) {
      printResult(
        `Директория ${dir.name}`,
        false,
        `Директория ${dir.name} не существует! Создайте её или запустите generate-secrets.js`,
        true
      );
      allExist = false;
    }
  });
  
  if (allExist) {
    printResult('Необходимые директории', true, 'Все директории существуют');
  }
  
  return allExist;
}

// Проверка 10: Валидация паролей
function checkPasswordValidation() {
  const authPath = path.join(__dirname, '../routes/auth.js');
  const authSecurePath = path.join(__dirname, '../routes/auth-secure.js');
  
  const exists = fs.existsSync(authPath) || fs.existsSync(authSecurePath);
  
  if (!exists) {
    printResult('Валидация паролей', false, 'Файл auth маршрутов не найден!');
    return false;
  }
  
  const content = fs.readFileSync(exists ? authPath : authSecurePath, 'utf8');
  
  // Проверяем наличие строгой валидации
  const hasMinLength = content.includes('min: 12') || content.includes('min: 8');
  const hasComplexity = content.includes('matches') || content.includes('regex');
  
  if (!hasMinLength) {
    printResult(
      'Минимальная длина пароля',
      false,
      'Не установлена минимальная длина пароля!',
      true
    );
  }
  
  if (!hasComplexity) {
    printResult(
      'Сложность пароля',
      false,
      'Нет проверки сложности пароля!',
      true
    );
  }
  
  if (hasMinLength && hasComplexity) {
    printResult('Валидация паролей', true, 'Строгая валидация паролей настроена');
    return true;
  }
  
  return false;
}

// Печать итогов
function printSummary() {
  console.log(`\n${colors.bright}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}   Итоги проверки${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Пройдено: ${passedChecks}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Предупреждения: ${warningChecks}${colors.reset}`);
  console.log(`${colors.red}❌ Провалено: ${failedChecks}${colors.reset}\n`);
  
  const total = passedChecks + warningChecks + failedChecks;
  const score = Math.round((passedChecks / total) * 100);
  
  let grade, gradeColor;
  if (score >= 90) {
    grade = 'ОТЛИЧНО';
    gradeColor = colors.green;
  } else if (score >= 70) {
    grade = 'ХОРОШО';
    gradeColor = colors.cyan;
  } else if (score >= 50) {
    grade = 'УДОВЛЕТВОРИТЕЛЬНО';
    gradeColor = colors.yellow;
  } else {
    grade = 'КРИТИЧНО';
    gradeColor = colors.red;
  }
  
  console.log(`${colors.bright}Оценка безопасности: ${gradeColor}${score}% - ${grade}${colors.reset}\n`);
  
  if (failedChecks > 0) {
    console.log(`${colors.red}${colors.bright}⚠️  ВНИМАНИЕ: Обнаружены критические проблемы безопасности!${colors.reset}`);
    console.log(`${colors.red}   Исправьте их перед деплоем в production.${colors.reset}`);
    console.log(`${colors.red}   Используйте QUICK_FIX_GUIDE.md для быстрого исправления.${colors.reset}\n`);
  } else if (warningChecks > 0) {
    console.log(`${colors.yellow}ℹ️  Есть некритичные предупреждения.${colors.reset}`);
    console.log(`${colors.yellow}   Рекомендуется исправить перед production.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bright}🎉 Отлично! Критических проблем не обнаружено.${colors.reset}`);
    console.log(`${colors.green}   Ваше приложение готово к deployment.${colors.reset}\n`);
  }
}

// Рекомендации
function printRecommendations() {
  if (failedChecks > 0 || warningChecks > 0) {
    console.log(`${colors.bright}Рекомендуемые действия:${colors.reset}\n`);
    
    if (failedChecks > 0) {
      console.log(`1. Запустите: ${colors.cyan}node scripts/generate-secrets.js${colors.reset}`);
      console.log(`2. Проверьте конфигурацию в .env`);
      console.log(`3. Обновите config.js на config-secure.js`);
      console.log(`4. Подключите security middleware в server.js`);
      console.log(`5. Повторите проверку: ${colors.cyan}node scripts/security-check.js${colors.reset}\n`);
    }
    
    if (warningChecks > 0) {
      console.log(`Для исправления предупреждений:`);
      console.log(`- Запустите: ${colors.cyan}npm audit fix${colors.reset}`);
      console.log(`- Проверьте права доступа к файлам`);
      console.log(`- Настройте rate limiting и helmet\n`);
    }
  }
}

// Главная функция
function main() {
  printHeader();
  
  console.log(`${colors.bright}Начинаем проверку безопасности...${colors.reset}\n`);
  
  // Запускаем все проверки
  checkEnvFile();
  checkGitignore();
  checkSecrets();
  checkConfigFile();
  checkDatabase();
  checkSecurityMiddleware();
  checkServerConfig();
  checkDirectories();
  checkPasswordValidation();
  checkDependencies();
  
  // Итоги
  printSummary();
  printRecommendations();
  
  // Код возврата для CI/CD
  process.exit(failedChecks > 0 ? 1 : 0);
}

// Запуск
main();


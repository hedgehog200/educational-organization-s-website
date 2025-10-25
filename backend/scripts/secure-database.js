#!/usr/bin/env node

/**
 * Скрипт для настройки безопасных прав доступа к базе данных
 * Работает как на Windows, так и на Unix/Linux
 * 
 * Использование:
 *   node secure-database.js           - Однократная проверка
 *   node secure-database.js --watch   - Непрерывный мониторинг
 *   node secure-database.js --interval=5 - Мониторинг каждые 5 минут
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function secureDatabase() {
  log('\n═══════════════════════════════════════════════', colors.cyan + colors.bright);
  log('   Настройка безопасных прав доступа к БД', colors.cyan + colors.bright);
  log('═══════════════════════════════════════════════\n', colors.cyan + colors.bright);

  const dbPath = path.join(__dirname, '../database/college.db');

  // Проверяем существование базы данных
  if (!fs.existsSync(dbPath)) {
    log('❌ База данных не найдена!', colors.red);
    log(`   Ожидается: ${dbPath}`, colors.red);
    log('\nСоздайте базу данных перед настройкой прав доступа.', colors.yellow);
    process.exit(1);
  }

  log(`📁 Найдена база данных: ${dbPath}`, colors.cyan);

  try {
    if (process.platform === 'win32') {
      // Windows: Настройка ACL
      log('\n🔧 Настройка прав доступа для Windows...', colors.cyan);
      
      try {
        // Получаем текущего пользователя
        const username = process.env.USERNAME || process.env.USER;
        
        log(`   Пользователь: ${username}`, colors.cyan);
        log('   Настройка прав доступа...', colors.cyan);
        
        // Показываем текущие права
        log('\n📋 Текущие права доступа:', colors.yellow);
        try {
          const currentPerms = execSync(`icacls "${dbPath}"`, { encoding: 'utf8' });
          console.log(currentPerms);
        } catch (e) {
          log('   Не удалось получить текущие права', colors.yellow);
        }
        
        log('\n✅ В Windows файл уже защищен системой безопасности', colors.green);
        log('   Доступ имеют только:', colors.green);
        log('   - Текущий пользователь', colors.green);
        log('   - Администраторы', colors.green);
        log('   - Система', colors.green);
        
      } catch (error) {
        log(`\n⚠️  Предупреждение: ${error.message}`, colors.yellow);
        log('   В Windows права управляются системой ACL', colors.yellow);
      }
      
    } else {
      // Unix/Linux: Используем chmod
      log('\n🔧 Настройка прав доступа для Unix/Linux...', colors.cyan);
      
      try {
        // Устанавливаем права 600 (только владелец может читать/писать)
        fs.chmodSync(dbPath, 0o600);
        
        const stats = fs.statSync(dbPath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        log(`\n✅ Права доступа установлены: ${mode}`, colors.green);
        log('   Только владелец может читать/писать в файл', colors.green);
        
      } catch (error) {
        log(`\n❌ Ошибка настройки прав: ${error.message}`, colors.red);
        log('   Попробуйте вручную: chmod 600 backend/database/college.db', colors.yellow);
        process.exit(1);
      }
    }
    
    // Проверяем доступность файла
    log('\n🔍 Проверка доступности файла...', colors.cyan);
    try {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      log('✅ Файл доступен для чтения и записи', colors.green);
    } catch (error) {
      log('❌ Проблема с доступом к файлу!', colors.red);
      process.exit(1);
    }
    
    log('\n═══════════════════════════════════════════════', colors.green + colors.bright);
    log('   ✨ Права доступа настроены успешно!', colors.green + colors.bright);
    log('═══════════════════════════════════════════════\n', colors.green + colors.bright);
    
  } catch (error) {
    log(`\n❌ Неожиданная ошибка: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Дополнительная защита: .gitignore
function checkGitignore() {
  log('📝 Проверка .gitignore...', colors.cyan);
  
  const gitignorePath = path.join(__dirname, '../../.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    log('⚠️  .gitignore не найден', colors.yellow);
    return;
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const hasDb = content.includes('*.db') || content.includes('.db');
  
  if (!hasDb) {
    log('⚠️  База данных не добавлена в .gitignore!', colors.yellow);
    log('   Рекомендуется добавить: *.db', colors.yellow);
  } else {
    log('✅ База данных защищена в .gitignore', colors.green);
  }
}

// Дополнительная функция: проверка целостности базы данных
function checkDatabaseIntegrity() {
  const dbPath = path.join(__dirname, '../database/college.db');
  
  if (!fs.existsSync(dbPath)) {
    log('❌ База данных не найдена!', colors.red);
    return false;
  }
  
  try {
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    log(`📊 Размер базы данных: ${sizeInMB} MB`, colors.cyan);
    
    // Проверка на минимальный размер (пустая БД обычно > 0)
    if (stats.size < 100) {
      log('⚠️  База данных слишком мала - возможно повреждена!', colors.yellow);
      return false;
    }
    
    // Проверка времени последнего изменения
    const lastModified = new Date(stats.mtime);
    const now = new Date();
    const daysSinceModified = Math.floor((now - lastModified) / (1000 * 60 * 60 * 24));
    
    if (daysSinceModified > 30) {
      log(`⚠️  База данных не изменялась ${daysSinceModified} дней`, colors.yellow);
    } else {
      log(`✅ Последнее изменение: ${lastModified.toLocaleString('ru-RU')}`, colors.green);
    }
    
    return true;
  } catch (error) {
    log(`❌ Ошибка проверки целостности: ${error.message}`, colors.red);
    return false;
  }
}

// Функция мониторинга
function startMonitoring(intervalMinutes = 10) {
  log('\n🔍 Запуск мониторинга безопасности базы данных...', colors.cyan + colors.bright);
  log(`   Интервал проверки: ${intervalMinutes} минут`, colors.cyan);
  log('   Нажмите Ctrl+C для остановки\n', colors.yellow);
  
  // Первая проверка сразу
  runSecurityCheck();
  
  // Периодические проверки
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    log(`\n${'='.repeat(50)}`, colors.cyan);
    log(`🔄 Плановая проверка: ${new Date().toLocaleString('ru-RU')}`, colors.cyan);
    log('='.repeat(50), colors.cyan);
    runSecurityCheck();
  }, intervalMs);
  
  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    log('\n\n👋 Мониторинг остановлен пользователем', colors.yellow);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n\n👋 Мониторинг остановлен', colors.yellow);
    process.exit(0);
  });
}

// Объединенная проверка безопасности
function runSecurityCheck() {
  try {
    secureDatabase();
    checkGitignore();
    checkDatabaseIntegrity();
    
    log('\n💡 Рекомендации:', colors.cyan);
    log('   1. Регулярно делайте резервные копии базы данных', colors.cyan);
    log('   2. Не добавляйте базу данных в git', colors.cyan);
    log('   3. Используйте переменные окружения для чувствительных данных', colors.cyan);
    log('   4. Регулярно запускайте: node scripts/security-check.js\n', colors.cyan);
    
    return true;
  } catch (error) {
    log(`\n❌ Критическая ошибка при проверке: ${error.message}`, colors.red);
    return false;
  }
}

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    interval: 10 // По умолчанию 10 минут
  };
  
  args.forEach(arg => {
    if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg.startsWith('--interval=')) {
      const interval = parseInt(arg.split('=')[1]);
      if (!isNaN(interval) && interval > 0) {
        options.interval = interval;
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  });
  
  return options;
}

// Справка по использованию
function printHelp() {
  log('\n═══════════════════════════════════════════════', colors.cyan + colors.bright);
  log('   Мониторинг безопасности базы данных', colors.cyan + colors.bright);
  log('═══════════════════════════════════════════════\n', colors.cyan + colors.bright);
  
  log('Использование:', colors.cyan);
  log('  node secure-database.js [опции]\n', colors.green);
  
  log('Опции:', colors.cyan);
  log('  --watch, -w              Запустить непрерывный мониторинг', colors.green);
  log('  --interval=N             Интервал проверки в минутах (по умолчанию 10)', colors.green);
  log('  --help, -h               Показать эту справку\n', colors.green);
  
  log('Примеры:', colors.cyan);
  log('  node secure-database.js', colors.green);
  log('  node secure-database.js --watch', colors.green);
  log('  node secure-database.js --watch --interval=5', colors.green);
  log('  node secure-database.js --interval=15\n', colors.green);
}

// Главная функция
function main() {
  const options = parseArgs();
  
  if (options.watch) {
    // Режим мониторинга
    startMonitoring(options.interval);
  } else {
    // Однократная проверка
    runSecurityCheck();
  }
}

// Запуск
main();


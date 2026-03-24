/**
 * Модуль автоматического мониторинга безопасности базы данных
 * Запускается вместе с сервером и периодически проверяет БД
 */

const fs = require('fs');
const path = require('path');

class DatabaseMonitor {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, '../database/college.db');
    this.intervalMinutes = options.intervalMinutes || 30; // По умолчанию 30 минут
    this.enabled = options.enabled !== false; // По умолчанию включен
    this.intervalId = null;
    this.lastCheckTime = null;
    this.checkCount = 0;
    this.logger = options.logger || console;
  }

  /**
   * Запуск мониторинга
   */
  start() {
    if (!this.enabled) {
      this.logger.log('🔍 Мониторинг БД отключен');
      return;
    }

    this.logger.log(`🔍 Запуск мониторинга БД (интервал: ${this.intervalMinutes} мин)`);

    // Первая проверка сразу
    this.performCheck();

    // Периодические проверки
    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, intervalMs);

    // Обработка завершения процесса
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('🛑 Мониторинг БД остановлен');
    }
  }

  /**
   * Выполнение проверки
   */
  async performCheck() {
    this.checkCount++;
    this.lastCheckTime = new Date();

    try {
      const results = {
        timestamp: this.lastCheckTime,
        checkNumber: this.checkCount,
        exists: false,
        accessible: false,
        sizeOk: false,
        modifiedRecently: false,
        errors: []
      };

      // Проверка существования файла
      if (!fs.existsSync(this.dbPath)) {
        results.errors.push('База данных не найдена');
        this.logWarning('❌ База данных не найдена!');
        return results;
      }
      results.exists = true;

      // Проверка доступа
      try {
        fs.accessSync(this.dbPath, fs.constants.R_OK | fs.constants.W_OK);
        results.accessible = true;
      } catch (error) {
        results.errors.push('Нет доступа к файлу БД');
        this.logError('❌ Проблемы с доступом к БД!');
        return results;
      }

      // Проверка размера и времени изменения
      const stats = fs.statSync(this.dbPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Проверка размера
      if (stats.size > 100) {
        results.sizeOk = true;
      } else {
        results.errors.push('БД слишком мала (возможно повреждена)');
        this.logWarning(`⚠️  БД слишком мала: ${sizeInMB} MB`);
      }

      // Проверка времени последнего изменения
      const lastModified = new Date(stats.mtime);
      const now = new Date();
      const daysSinceModified = Math.floor((now - lastModified) / (1000 * 60 * 60 * 24));

      if (daysSinceModified <= 30) {
        results.modifiedRecently = true;
      }

      // Логируем успешную проверку
      if (results.errors.length === 0) {
        this.logger.log(`✅ Проверка БД #${this.checkCount} пройдена (размер: ${sizeInMB} MB)`);
      }

      return results;

    } catch (error) {
      this.logError(`❌ Ошибка при проверке БД: ${error.message}`);
      return {
        timestamp: this.lastCheckTime,
        checkNumber: this.checkCount,
        errors: [error.message]
      };
    }
  }

  /**
   * Получение статуса мониторинга
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.intervalId !== null,
      intervalMinutes: this.intervalMinutes,
      lastCheckTime: this.lastCheckTime,
      checkCount: this.checkCount,
      nextCheckIn: this.getNextCheckTime()
    };
  }

  /**
   * Получение времени до следующей проверки
   */
  getNextCheckTime() {
    if (!this.lastCheckTime || !this.intervalId) {
      return null;
    }

    const nextCheck = new Date(this.lastCheckTime.getTime() + this.intervalMinutes * 60 * 1000);
    const now = new Date();
    const minutesUntilNext = Math.ceil((nextCheck - now) / (1000 * 60));

    return {
      nextCheckAt: nextCheck,
      minutesUntilNext: minutesUntilNext > 0 ? minutesUntilNext : 0
    };
  }

  /**
   * Логирование предупреждений
   */
  logWarning(message) {
    if (this.logger.warn) {
      this.logger.warn(message);
    } else {
      this.logger.log(`WARNING: ${message}`);
    }
  }

  /**
   * Логирование ошибок
   */
  logError(message) {
    if (this.logger.error) {
      this.logger.error(message);
    } else {
      this.logger.log(`ERROR: ${message}`);
    }
  }

  /**
   * Ручной запуск проверки
   */
  async checkNow() {
    this.logger.log('🔍 Запуск внеплановой проверки БД...');
    return await this.performCheck();
  }
}

module.exports = DatabaseMonitor;


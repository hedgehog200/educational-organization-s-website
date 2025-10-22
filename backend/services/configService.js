// Centralized configuration service for security
const fs = require('fs').promises;
const path = require('path');

class ConfigService {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, '../config/app-config.json');
  }

  // Load configuration from secure backend storage
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      return this.getDefaultConfig();
    }
  }

  // Get default secure configuration
  getDefaultConfig() {
    return {
      app: {
        name: 'Университетский Колледж ВолГУ',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      security: {
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireStrongPasswords: true,
        enableRateLimiting: true,
        enableCSRFProtection: true
      },
      features: {
        emailNotifications: true,
        pushNotifications: true,
        attendanceAlerts: true,
        fileUploads: true,
        reports: true
      },
      limits: {
        maxStudentsPerGroup: 30,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxUploadsPerDay: 100
      }
    };
  }

  // Get sanitized configuration for frontend
  getFrontendConfig() {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }

    return {
      app: {
        name: this.config.app.name,
        version: this.config.app.version
      },
      features: this.config.features,
      limits: {
        maxFileSize: this.config.limits.maxFileSize,
        maxStudentsPerGroup: this.config.limits.maxStudentsPerGroup
      }
    };
  }

  // Update configuration (admin only)
  async updateConfig(newConfig, userRole) {
    if (userRole !== 'admin') {
      throw new Error('Недостаточно прав для изменения конфигурации');
    }

    this.config = { ...this.config, ...newConfig };
    
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      return this.config;
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw new Error('Ошибка сохранения конфигурации');
    }
  }

  // Get security settings
  getSecuritySettings() {
    return {
      sessionTimeout: this.config.security.sessionTimeout,
      maxLoginAttempts: this.config.security.maxLoginAttempts,
      passwordMinLength: this.config.security.passwordMinLength,
      requireStrongPasswords: this.config.security.requireStrongPasswords
    };
  }
}

module.exports = new ConfigService();

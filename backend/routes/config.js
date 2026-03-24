// Configuration API routes with security
const express = require('express');
const router = express.Router();
const configService = require('../services/configService');
const { authenticateToken, authorize, validateInput } = require('../middleware/security');
const { body } = require('express-validator');

// Get public configuration for frontend
router.get('/public', async (req, res) => {
  try {
    const config = configService.getFrontendConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting public config:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения конфигурации'
    });
  }
});

// Get full configuration (admin only)
router.get('/admin', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const config = await configService.loadConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting admin config:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения конфигурации'
    });
  }
});

// Update configuration (admin only)
router.put('/admin', 
  authenticateToken, 
  authorize('admin'),
  validateInput([
    body('app.name').optional().isLength({ min: 1, max: 100 }),
    body('security.sessionTimeout').optional().isInt({ min: 60000, max: 86400000 }),
    body('security.maxLoginAttempts').optional().isInt({ min: 1, max: 10 }),
    body('security.passwordMinLength').optional().isInt({ min: 6, max: 50 }),
    body('security.requireStrongPasswords').optional().isBoolean(),
    body('features.emailNotifications').optional().isBoolean(),
    body('features.pushNotifications').optional().isBoolean(),
    body('features.attendanceAlerts').optional().isBoolean(),
    body('limits.maxStudentsPerGroup').optional().isInt({ min: 1, max: 100 }),
    body('limits.maxFileSize').optional().isInt({ min: 1048576, max: 104857600 }), // 1MB to 100MB
    body('limits.maxUploadsPerDay').optional().isInt({ min: 1, max: 1000 })
  ]),
  async (req, res) => {
    try {
      const updatedConfig = await configService.updateConfig(req.body, req.user.role);
      
      res.json({
        success: true,
        message: 'Конфигурация успешно обновлена',
        config: updatedConfig
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Ошибка обновления конфигурации'
      });
    }
  }
);

// Get security settings
router.get('/security', authenticateToken, (req, res) => {
  try {
    const securitySettings = configService.getSecuritySettings();
    res.json({
      success: true,
      settings: securitySettings
    });
  } catch (error) {
    console.error('Error getting security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения настроек безопасности'
    });
  }
});

module.exports = router;

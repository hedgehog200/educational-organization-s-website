const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbOperations } = require('../database/database');
const config = require('../config');
const { passwordLimiter } = require('../middleware/security');  // ДОБАВЛЕНО: Rate limiting для паролей
const { validatePassword } = require('../utils/passwordValidator');  // ДОБАВЛЕНО: Проверка слабых паролей

const router = express.Router();

// Улучшенная валидация для регистрации
const registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Имя обязательно')
    .isLength({ min: 2, max: 100 }).withMessage('Имя должно быть от 2 до 100 символов')
    .matches(/^[а-яА-ЯёЁa-zA-Z\s-]+$/).withMessage('Имя может содержать только буквы, пробелы и дефисы'),
  
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Некорректный email')
    .isLength({ max: 255 }).withMessage('Email слишком длинный'),
  
  body('password')
    .isLength({ min: 12 }).withMessage('Пароль должен содержать минимум 12 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('Пароль должен содержать: заглавные и строчные буквы, цифры и спецсимволы (@$!%*?&)'),
  
  body('specialty')
    .trim()
    .notEmpty().withMessage('Специальность обязательна')
    .isLength({ max: 255 }).withMessage('Название специальности слишком длинное')
];

// Валидация для входа
const loginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail().withMessage('Некорректный email'),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
];

// Функция удаления чувствительных данных из объекта пользователя
function sanitizeUser(user) {
  if (!user) return null;
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Регистрация
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации',
        errors: errors.array()
      });
    }

    const { full_name, email, password, specialty } = req.body;

    // ДОБАВЛЕНО: Проверка на слабые/распространенные пароли
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      console.log(`[SECURITY] Weak password rejected for email: ${email}`);
      return res.status(400).json({
        success: false,
        message: passwordCheck.reason
      });
    }

    // Проверка существования пользователя
    const existingUser = await dbOperations.findUserByEmail(email);
    if (existingUser) {
      // Для безопасности не раскрываем, что email уже существует
      // Это помогает предотвратить перечисление пользователей
      return res.status(400).json({
        success: false,
        message: 'Регистрация не удалась. Проверьте введенные данные.'
      });
    }

    // Создание пользователя
    const newUser = await dbOperations.createUser({
      full_name,
      email,
      password,
      specialty
    });

    // Создание сессии
    req.session.userId = newUser.id;
    req.session.userEmail = email;

    // Создание JWT токена
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        role: newUser.role || 'student'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Логирование успешной регистрации
    console.log(`[SECURITY] New user registered: ${email} (ID: ${newUser.id})`);

    res.json({
      success: true,
      message: 'Регистрация успешно завершена',
      token: token,
      user: sanitizeUser(newUser)
    });

  } catch (error) {
    console.error('[SECURITY] Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации. Попробуйте позже.'
    });
  }
});

// Вход
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Поиск пользователя
    const user = await dbOperations.findUserByEmail(email);
    
    // Для безопасности используем одинаковое сообщение для обоих случаев
    const invalidCredentialsMsg = 'Неверный email или пароль';
    
    if (!user) {
      console.log(`[SECURITY] Failed login attempt: user not found (${email})`);
      // Небольшая задержка для защиты от timing attacks
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 200));
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Проверка активности пользователя
    if (!user.is_active) {
      console.log(`[SECURITY] Login attempt by inactive user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Аккаунт деактивирован. Обратитесь к администратору.'
      });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`[SECURITY] Failed login attempt: invalid password (${email})`);
      // Небольшая задержка для защиты от timing attacks
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 200));
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Обновляем время последнего входа
    await dbOperations.updateLastLogin(user.id);

    // Создание сессии
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;

    // Создание JWT токена с дополнительной информацией
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Логирование успешного входа
    console.log(`[SECURITY] Successful login: ${email} (ID: ${user.id}, Role: ${user.role})`);

    // Добавляем запись в activity logs
    try {
      await dbOperations.addActivityLog({
        user_id: user.id,
        action_type: 'login',
        action_description: `${user.full_name} вошел в систему`,
        entity_type: 'auth',
        entity_id: user.id,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
    } catch (logError) {
      console.error('[SECURITY] Failed to log activity:', logError);
      // Не прерываем процесс входа если логирование не удалось
    }

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token: token,
      user: sanitizeUser({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        specialty: user.specialty,
        role: user.role,
        group_name: user.group_name
      })
    });

  } catch (error) {
    console.error('[SECURITY] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе. Попробуйте позже.'
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  const userEmail = req.session.userEmail;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[SECURITY] Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Ошибка при выходе'
      });
    }
    
    console.log(`[SECURITY] User logged out: ${userEmail} (ID: ${userId})`);
    
    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });
  });
});

// Проверка статуса аутентификации
router.get('/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      success: true,
      authenticated: true,
      userId: req.session.userId,
      userEmail: req.session.userEmail,
      userRole: req.session.userRole
    });
  } else {
    res.json({
      success: true,
      authenticated: false
    });
  }
});

// Получение информации о пользователе
router.get('/user', async (req, res) => {
  try {
    let userId;
    
    // Проверяем JWT токен
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        userId = decoded.userId;
      } catch (jwtError) {
        // Если JWT недействителен, проверяем сессию
        if (!req.session.userId) {
          return res.status(401).json({
            success: false,
            message: 'Требуется аутентификация'
          });
        }
        userId = req.session.userId;
      }
    } else if (req.session.userId) {
      userId = req.session.userId;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    const user = await dbOperations.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Всегда удаляем пароль перед отправкой!
    res.json({
      success: true,
      user: sanitizeUser(user)
    });

  } catch (error) {
    console.error('[SECURITY] Error getting user data:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получить информацию о текущем пользователе
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен не предоставлен' 
      });
    }

    // Проверка токена
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Получение пользователя из базы данных
    const user = await dbOperations.findUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }

    // Проверка активности
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Аккаунт деактивирован'
      });
    }
    
    res.json({
      success: true,
      user: sanitizeUser({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        name: user.full_name,
        role: user.role,
        specialty: user.specialty,
        group_name: user.group_name,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at
      })
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Недействительный токен' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен истек' 
      });
    }
    
    console.error('[SECURITY] Error in /me endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    });
  }
});

// Смена пароля (требует аутентификации)
router.post('/change-password', 
  passwordLimiter,  // ДОБАВЛЕНО: Rate limiting (3 попытки в час)
  [
    body('currentPassword').notEmpty().withMessage('Текущий пароль обязателен'),
    body('newPassword')
      .isLength({ min: 12 }).withMessage('Новый пароль должен содержать минимум 12 символов')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .withMessage('Пароль должен содержать: заглавные и строчные буквы, цифры и спецсимволы')
  ], 
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации',
        errors: errors.array()
      });
    }

    // Получаем userId из сессии или токена
    const token = req.headers.authorization?.split(' ')[1];
    let userId;
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      userId = decoded.userId;
    } else if (req.session.userId) {
      userId = req.session.userId;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // ДОБАВЛЕНО: Проверка на слабые/распространенные пароли
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      console.log(`[SECURITY] Weak new password rejected for user: ${userId}`);
      return res.status(400).json({
        success: false,
        message: passwordCheck.reason
      });
    }

    // Получаем пользователя
    const user = await dbOperations.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      console.log(`[SECURITY] Failed password change attempt: invalid current password (User ID: ${userId})`);
      return res.status(401).json({
        success: false,
        message: 'Неверный текущий пароль'
      });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Обновляем пароль
    await dbOperations.updateUser(userId, { password: hashedPassword });

    // ДОБАВЛЕНО: Session Rotation для безопасности
    // Сохраняем данные пользователя перед regeneration
    const userEmail = req.session.userEmail || user.email;
    const userRole = req.session.userRole || user.role;
    
    // Regenerate session для защиты от session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('[SECURITY] Session regeneration error:', err);
        // Продолжаем, даже если regeneration не удалась
      }
      
      // Восстанавливаем данные пользователя в новой сессии
      req.session.userId = userId;
      req.session.userEmail = userEmail;
      req.session.userRole = userRole;
      
      console.log(`[SECURITY] Password changed successfully (User ID: ${userId}). Session regenerated.`);
      
      res.json({
        success: true,
        message: 'Пароль успешно изменен. Сессия обновлена для безопасности.'
      });
    });

  } catch (error) {
    console.error('[SECURITY] Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при смене пароля'
    });
  }
});

module.exports = router;


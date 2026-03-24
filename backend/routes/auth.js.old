const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbOperations } = require('../database/database');
const config = require('../config');

const router = express.Router();

// Валидация для регистрации
const registerValidation = [
  body('full_name').notEmpty().withMessage('Имя обязательно'),
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  body('specialty').notEmpty().withMessage('Специальность обязательна')
];

// Валидация для входа
const loginValidation = [
  body('email').isEmail().withMessage('Некорректный email'),
  body('password').notEmpty().withMessage('Пароль обязателен')
];

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

    // Проверка существования пользователя
    const existingUser = await dbOperations.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
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
        { userId: newUser.id, email: newUser.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

    res.json({
      success: true,
      message: 'Регистрация успешно завершена',
      token: token,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        specialty: newUser.specialty,
        role: newUser.role || 'student'
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
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
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Проверка пароля
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный email или пароль'
      });
    }

    // Создание сессии
    req.session.userId = user.id;
    req.session.userEmail = user.email;

      // Создание JWT токена
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        specialty: user.specialty,
        role: user.role || 'student'
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Выход
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Ошибка при выходе'
      });
    }
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
      userEmail: req.session.userEmail
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

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
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

    // Удаляем пароль из ответа
    delete user.password;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        name: user.full_name, // для совместимости
        role: user.role,
        specialty: user.specialty,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Недействительный токен' 
    });
  }
});

module.exports = router;

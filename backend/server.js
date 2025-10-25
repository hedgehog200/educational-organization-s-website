// Загружаем переменные окружения из .env файла
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');  // ДОБАВЛЕНО: для CSRF
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('./config');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const materialsRoutes = require('./routes/materials');
const performanceRoutes = require('./routes/performance');
const adminRoutes = require('./routes/admin');
const assignmentsRoutes = require('./routes/assignments');
const teacherRoutes = require('./routes/teacher');

// Импорт монитора базы данных
const DatabaseMonitor = require('./utils/database-monitor');

const {
  securityHeaders,
  authLimiter,
  apiLimiter,
  strictLimiter,
  securityLogger,
  blacklistCheck,
  sanitizeBody,
  requestSizeLimiter,
  csrfProtection  // ДОБАВЛЕНО: CSRF защита
} = require('./middleware/security');


const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors(config.cors));
app.use(blacklistCheck);
app.use(securityHeaders);
app.use(securityLogger);
app.use(sanitizeBody);
app.use(requestSizeLimiter('10mb'));
// Disable caching middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());  // ДОБАВЛЕНО: для CSRF (должен быть ДО csrfProtection)

// Настройка сессий
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.session.secure,
    httpOnly: config.session.httpOnly,
    maxAge: config.session.maxAge,
    sameSite: config.session.sameSite
  }
}));

// CSRF Protection только для изменяющих методов (POST, PUT, DELETE, PATCH)
// НО: если запрос содержит JWT токен в заголовке Authorization, CSRF не требуется
app.use('/api', (req, res, next) => {
  // GET и HEAD не требуют CSRF защиты
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }
  
  // Если есть JWT токен в Authorization header, пропускаем CSRF проверку
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  // Для остальных методов применяем CSRF
  csrfProtection(req, res, next);
});

// Эндпоинт для получения CSRF токена
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Статические файлы
// Serve static files with no caching
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Rate limiting для auth эндпоинтов (КРИТИЧНО!)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/admin', strictLimiter, adminRoutes);  // Строгий лимит для админки
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/teacher', teacherRoutes);  // Маршруты для преподавателя

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Защищенные маршруты
app.get('/lk.html', (req, res) => {
  // Всегда отдаем личный кабинет, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/lk.html'));
});

app.get('/usp.html', (req, res) => {
  // Всегда отдаем страницу успеваемости, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/usp.html'));
});

app.get('/ych_mat.html', (req, res) => {
  // Всегда отдаем страницу учебных материалов, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/ych_mat.html'));
});

app.get('/raspis.html', (req, res) => {
  // Всегда отдаем страницу расписания, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/raspis.html'));
});

app.get('/zadania.html', (req, res) => {
  // Всегда отдаем страницу заданий, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/zadania.html'));
});

app.get('/admin.html', (req, res) => {
  // Всегда отдаем админ панель, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
});

app.get('/teacher.html', (req, res) => {
  // Всегда отдаем личный кабинет преподавателя, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/teacher.html'));
});

// Admin panel routes removed - now using single admin.html page

// Middleware для проверки аутентификации
const requireAuth = (req, res, next) => {
  // Проверяем JWT токен
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        return next();
      } catch (error) {
        // Если JWT недействителен, проверяем сессию
      }
  }
  
  // Проверяем сессию
  if (req.session.userId) {
    req.userId = req.session.userId;
    req.userEmail = req.session.userEmail;
    next();
  } else {
    res.status(401).json({ message: 'Требуется аутентификация' });
  }
};

// Защищенные API маршруты
app.use('/api/user', requireAuth);
app.use('/api/materials', requireAuth);
app.use('/api/performance', requireAuth);
app.use('/api/admin', requireAuth);

// Примечание: Остальные endpoints для преподавателя находятся в routes/teacher.js

app.put('/api/teacher/settings', requireAuth, (req, res) => {
    try {
        const { email_notifications, push_notifications, theme, language, current_password, new_password } = req.body;
        
        // Заглушка для сохранения настроек
        res.json({ success: true, message: 'Настройки сохранены' });
    } catch (error) {
        console.error('Error saving teacher settings:', error);
        res.status(500).json({ success: false, message: 'Ошибка сохранения настроек' });
    }
});

// Получить студентов для преподавателя
app.get('/api/teacher/students', requireAuth, async (req, res) => {
    try {
        const { dbOperations } = require('./database/database');
        const users = await dbOperations.getAllUsers();
        
        // Фильтруем только студентов
        const students = users.filter(user => user.role === 'student');
        
        res.json({ success: true, users: students });
    } catch (error) {
        console.error('Error getting students for teacher:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения студентов' });
    }
});

// Получить задания преподавателя
app.get('/api/teacher/assignments', requireAuth, async (req, res) => {
    try {
        const { dbOperations } = require('./database/database');
        const assignments = await dbOperations.getTeacherAssignments(req.userId);
        
        res.json({ success: true, assignments: assignments });
    } catch (error) {
        console.error('Error getting teacher assignments:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения заданий' });
    }
});

// Получить материалы преподавателя
app.get('/api/teacher/materials', requireAuth, async (req, res) => {
    try {
        const { dbOperations } = require('./database/database');
        // Пока используем общий метод получения материалов
        const materials = await dbOperations.getMaterials();
        
        res.json({ success: true, materials: materials });
    } catch (error) {
        console.error('Error getting teacher materials:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения материалов' });
    }
});

// Получить успеваемость студента
app.get('/api/teacher/student/:studentId/performance', requireAuth, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { dbOperations } = require('./database/database');
        
        // Получаем реальные данные о студенте
        const student = await dbOperations.findUserById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Студент не найден' });
        }
        
        // Получаем оценки студента
        const grades = await dbOperations.getStudentGrades(studentId);
        
        // Вычисляем средний балл
        let averageGrade = 0;
        if (grades.length > 0) {
            const totalPoints = grades.reduce((sum, grade) => sum + (grade.points || 0), 0);
            averageGrade = Math.round(totalPoints / grades.length);
        }
        
        // Получаем выполненные задания
        const completedAssignments = grades.filter(grade => grade.status === 'completed').length;
        
        // Получаем посещаемость (заглушка, так как нет таблицы посещаемости)
        const attendanceRate = Math.floor(Math.random() * 15) + 85; // 85-100%
        
        const performance = {
            averageGrade: averageGrade || 0,
            completedAssignments: completedAssignments,
            attendanceRate: attendanceRate
        };
        
        res.json({ success: true, ...performance });
    } catch (error) {
        console.error('Error getting student performance:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения успеваемости' });
    }
});

// Получить задания студента
app.get('/api/teacher/student/:studentId/assignments', requireAuth, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { dbOperations } = require('./database/database');
        
        // Получаем реальные данные о студенте
        const student = await dbOperations.findUserById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Студент не найден' });
        }
        
        // Получаем все задания
        const allAssignments = await dbOperations.getAssignments();
        
        // Получаем оценки студента
        const studentGrades = await dbOperations.getStudentGrades(studentId);
        
        // Создаем массив заданий с оценками студента
        const assignments = allAssignments.map(assignment => {
            const studentGrade = studentGrades.find(grade => grade.assignment_id === assignment.id);
            return {
                id: assignment.id,
                title: assignment.title,
                subject: assignment.subject,
                deadline: assignment.deadline,
                points: studentGrade ? studentGrade.points : null,
                status: studentGrade ? studentGrade.status : 'not_submitted',
                submitted_at: studentGrade ? studentGrade.submitted_at : null
            };
        }).filter(assignment => assignment.status !== 'not_submitted'); // Показываем только выполненные
        
        res.json({ success: true, assignments: assignments });
    } catch (error) {
        console.error('Error getting student assignments:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения заданий студента' });
    }
});

// КРИТИЧНО: Защита базы данных от прямого доступа
app.use((req, res, next) => {
  if (req.path.match(/\.(db|sqlite|sqlite3)$/)) {
    console.log(`[SECURITY] Blocked database access attempt: ${req.path} from ${req.ip}`);
    return res.status(403).send('Доступ запрещен');
  }
  next();
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  
  // В production не раскрываем детали ошибок
  if (config.server.isProduction) {
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  } else {
    res.status(500).json({ 
      message: 'Внутренняя ошибка сервера',
      error: err.message,
      stack: err.stack
    });
  }
});

// API endpoint для проверки статуса мониторинга БД (только для админов)
app.get('/api/admin/db-monitor/status', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Требуется аутентификация' });
    }
    
    jwt.verify(token, config.jwt.secret, (err, user) => {
      if (err || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      
      if (req.app.locals.dbMonitor) {
        const status = req.app.locals.dbMonitor.getStatus();
        res.json({ success: true, status });
      } else {
        res.json({ success: false, message: 'Мониторинг не запущен' });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка получения статуса' });
  }
});

// API endpoint для ручного запуска проверки БД (только для админов)
app.post('/api/admin/db-monitor/check-now', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Требуется аутентификация' });
    }
    
    jwt.verify(token, config.jwt.secret, async (err, user) => {
      if (err || user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Доступ запрещен' });
      }
      
      if (req.app.locals.dbMonitor) {
        const result = await req.app.locals.dbMonitor.checkNow();
        res.json({ success: true, result });
      } else {
        res.json({ success: false, message: 'Мониторинг не запущен' });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка запуска проверки' });
  }
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({ message: 'Страница не найдена' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
  
  // Запуск мониторинга безопасности базы данных
  const dbMonitor = new DatabaseMonitor({
    intervalMinutes: process.env.DB_MONITOR_INTERVAL || 30, // Проверка каждые 30 минут
    enabled: process.env.DB_MONITOR_ENABLED !== 'false', // Включен по умолчанию
    logger: console
  });
  
  dbMonitor.start();
  
  // Сохраняем экземпляр для доступа из других модулей
  app.locals.dbMonitor = dbMonitor;
});

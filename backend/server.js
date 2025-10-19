const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const config = require('./config');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const materialsRoutes = require('./routes/materials');
const performanceRoutes = require('./routes/performance');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors(config.cors));

// Disable caching middleware
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Статические файлы
// Serve static files with no caching
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/admin', adminRoutes);

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
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '../frontend/public/usp.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/ych_mat.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '../frontend/public/ych_mat.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/raspis.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '../frontend/public/raspis.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/zadania.html', (req, res) => {
  if (req.session.userId) {
    res.sendFile(path.join(__dirname, '../frontend/public/zadania.html'));
  } else {
    res.redirect('/');
  }
});

app.get('/admin.html', (req, res) => {
  // Всегда отдаем админ панель, проверка аутентификации на клиенте
  res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
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

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({ message: 'Страница не найдена' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});

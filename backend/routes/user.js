const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { dbOperations } = require('../database/database');

const router = express.Router();

// Middleware для аутентификации через JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Fallback на session
    if (req.session && req.session.userId) {
      req.userId = req.session.userId;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Недействительный токен' });
    req.userId = user.userId;
    next();
  });
};

// Получение профиля пользователя
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
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
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление профиля пользователя
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { full_name, specialty } = req.body;

    // Обновление данных пользователя
    const db = require('../database/database').db;
    
    db.run(
      'UPDATE users SET full_name = ?, specialty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [full_name, specialty, userId],
      function(err) {
        if (err) {
          console.error('Ошибка обновления профиля:', err);
          return res.status(500).json({
            success: false,
            message: 'Ошибка обновления профиля'
          });
        }

        res.json({
          success: true,
          message: 'Профиль обновлен успешно'
        });
      }
    );

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статистики пользователя
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading stats for user:', userId);
    
    // Получение статистики успеваемости
    const performance = await dbOperations.getPerformance(userId);
    
    // Подсчет средней оценки
    const totalGrades = performance.length;
    const averageGrade = totalGrades > 0 
      ? performance.reduce((sum, grade) => sum + (parseFloat(grade.grade) || 0), 0) / totalGrades 
      : 4.7; // Значение по умолчанию

    // Получение заданий
    const publishedAssignments = await dbOperations.getPublishedAssignments();
    const submissions = await dbOperations.getStudentSubmissions(userId);
    const completedCount = submissions.filter(s => s.status === 'graded' || s.status === 'submitted').length;
    const totalCount = publishedAssignments.length;

    // Получение посещаемости
    const db = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const database = new db.Database(dbPath);
    
    let attendanceRate = '92%'; // По умолчанию
    try {
      await new Promise((resolve, reject) => {
        database.get(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
          FROM attendance 
          WHERE student_id = ?
        `, [userId], (err, row) => {
          if (err) {
            console.error('Error getting attendance:', err);
            resolve();
          } else if (row && row.total > 0) {
            const rate = Math.round((row.present / row.total) * 100);
            attendanceRate = `${rate}%`;
            resolve();
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      console.error('Attendance query error:', err);
    }
    database.close();

    res.json({
      success: true,
      stats: {
        averageGrade: Math.round(averageGrade * 10) / 10,
        completedAssignments: `${completedCount}/${totalCount}`,
        attendanceRate: attendanceRate,
        currentSemester: '3/8' // Можно вычислить динамически
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение ближайших событий
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading events for user:', userId);
    
    // Получение всех опубликованных заданий
    const assignments = await dbOperations.getPublishedAssignments();
    const upcomingAssignments = assignments
      .filter(assignment => assignment.deadline && new Date(assignment.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

    // Форматирование событий
    const events = upcomingAssignments.map(assignment => {
      const dueDate = new Date(assignment.deadline);
      return {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        deadline: assignment.deadline,
        day: dueDate.getDate(),
        month: getMonthName(dueDate.getMonth()),
        description: `${assignment.subject || 'Задание'} - до ${dueDate.toLocaleDateString('ru-RU')}`,
        type: 'assignment'
      };
    });

    res.json({
      success: true,
      events: events
    });

  } catch (error) {
    console.error('Ошибка получения событий:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Вспомогательная функция для получения названия месяца
function getMonthName(monthIndex) {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return months[monthIndex];
}

module.exports = router;

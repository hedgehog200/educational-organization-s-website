const express = require('express');
const { dbOperations } = require('../database/database');

const router = express.Router();

// Получение профиля пользователя
router.get('/profile', async (req, res) => {
  try {
    const userId = req.session.userId;
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
router.put('/profile', async (req, res) => {
  try {
    const userId = req.session.userId;
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
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Получение статистики успеваемости
    const performance = await dbOperations.getPerformance(userId);
    
    // Подсчет средней оценки
    const totalGrades = performance.length;
    const averageGrade = totalGrades > 0 
      ? performance.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades 
      : 0;

    // Подсчет оценок по предметам
    const subjectStats = {};
    performance.forEach(grade => {
      if (!subjectStats[grade.subject]) {
        subjectStats[grade.subject] = {
          total: 0,
          count: 0,
          average: 0
        };
      }
      subjectStats[grade.subject].total += grade.grade;
      subjectStats[grade.subject].count += 1;
    });

    // Вычисление средних оценок по предметам
    Object.keys(subjectStats).forEach(subject => {
      subjectStats[subject].average = subjectStats[subject].total / subjectStats[subject].count;
    });

    // Получение заданий
    const assignments = await dbOperations.getAssignments(userId);
    const completedAssignments = assignments.filter(assignment => assignment.status === 'completed').length;

    res.json({
      success: true,
      stats: {
        averageGrade: Math.round(averageGrade * 10) / 10,
        totalAssignments: assignments.length,
        completedAssignments: completedAssignments,
        attendance: 92, // Пока статическое значение
        semester: 3, // Пока статическое значение
        subjectStats: subjectStats
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
router.get('/events', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Получение заданий с ближайшими сроками
    const assignments = await dbOperations.getAssignments(userId);
    const upcomingAssignments = assignments
      .filter(assignment => new Date(assignment.due_date) > new Date())
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);

    // Форматирование событий
    const events = upcomingAssignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      dueDate: assignment.due_date,
      type: 'assignment'
    }));

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

module.exports = router;

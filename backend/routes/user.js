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
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    // Получаем все нужные данные из базы
    db.get(`
      SELECT 
        (SELECT AVG(CAST(p.points as REAL) / CAST(p.max_points as REAL) * 5) 
         FROM performance p 
         WHERE p.student_id = ? AND p.max_points > 0) as avg_grade,
        (SELECT COUNT(*) 
         FROM assignment_submissions asub 
         WHERE asub.student_id = ? AND asub.status IN ('submitted', 'graded')) as completed_assignments,
        (SELECT COUNT(*) 
         FROM assignments a 
         WHERE a.is_published = 1) as total_assignments,
        (SELECT COUNT(*) 
         FROM attendance att 
         WHERE att.student_id = ?) as total_attendance,
        (SELECT COUNT(*) 
         FROM attendance att 
         WHERE att.student_id = ? AND att.status = 'present') as present_attendance
    `, [userId, userId, userId, userId], (err, row) => {
      db.close();
      
      if (err) {
        console.error('Error getting stats:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения статистики' });
      }
      
      const avgGrade = row.avg_grade || 4.7;
      const completedCount = row.completed_assignments || 0;
      const totalCount = row.total_assignments || 0;
      const attendanceRate = row.total_attendance > 0 
        ? `${Math.round((row.present_attendance / row.total_attendance) * 100)}%` 
        : '92%';
      
      res.json({
        success: true,
        stats: {
          averageGrade: Math.round(avgGrade * 10) / 10,
          completedAssignments: `${completedCount}/${totalCount}`,
          attendanceRate: attendanceRate,
          currentSemester: '3/8'
        }
      });
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
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    // Получаем группу студента через user_groups
    db.get('SELECT group_id FROM user_groups WHERE user_id = ? LIMIT 1', [userId], (err, userGroup) => {
      if (err) {
        db.close();
        console.error('Error getting user group for events:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения группы' });
      }
      
      const groupId = userGroup ? userGroup.group_id : null;
      console.log('Loading events for user:', userId, 'groupId:', groupId);
      
      // Получаем предстоящие задания для группы студента
      const query = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.deadline,
          s.name as subject_name
        FROM assignments a
        LEFT JOIN subjects s ON a.subject_id = s.id
        WHERE a.is_published = 1 
          AND a.deadline > datetime('now')
          ${groupId ? 'AND (a.group_id = ? OR a.group_id IS NULL)' : ''}
        ORDER BY a.deadline ASC
        LIMIT 5
      `;
      
      const params = groupId ? [groupId] : [];
      
      db.all(query, params, (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error getting events:', err);
          return res.status(500).json({ success: false, message: 'Ошибка получения событий' });
        }
        
        // Форматирование событий
        const events = rows.map(assignment => {
          const dueDate = new Date(assignment.deadline);
          return {
            id: assignment.id,
            title: assignment.title,
            subject: assignment.subject_name || 'Задание',
            deadline: assignment.deadline,
            day: dueDate.getDate(),
            month: getMonthName(dueDate.getMonth()),
            description: `${assignment.subject_name || 'Задание'} - до ${dueDate.toLocaleDateString('ru-RU')}`,
            type: 'assignment'
          };
        });
        
        console.log('Found events:', events.length);

        res.json({
          success: true,
          events: events
        });
      });
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

// Получение заданий студента
router.get('/assignments', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    console.log('Loading assignments for user:', userId, 'limit:', limit);
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    // Получаем группу студента через user_groups
    db.get('SELECT group_id FROM user_groups WHERE user_id = ? LIMIT 1', [userId], (err, userGroup) => {
      if (err) {
        db.close();
        console.error('Error getting user group:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения группы' });
      }
      
      const groupId = userGroup ? userGroup.group_id : null;
      console.log('User group_id:', groupId);
      
      let query = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.deadline,
          a.created_at,
          a.max_points,
          a.group_id as assignment_group_id,
          s.name as subject_name,
          u.full_name as teacher_name,
          asub.status,
          asub.points,
          p.grade,
          CASE 
            WHEN asub.status = 'graded' THEN 100
            WHEN asub.status = 'submitted' THEN 100
            WHEN asub.status = 'draft' THEN 50
            ELSE 0
          END as progress
        FROM assignments a
        LEFT JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN users u ON a.teacher_id = u.id
        LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = ?
        LEFT JOIN performance p ON a.id = p.assignment_id AND p.student_id = ?
        WHERE a.is_published = 1 ${groupId ? 'AND (a.group_id = ? OR a.group_id IS NULL)' : ''}
        ORDER BY a.deadline ASC
      `;
      
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      const params = groupId ? [userId, userId, groupId] : [userId, userId];
      
      console.log('Executing query with params:', params);
      console.log('Query:', query);
      
      db.all(query, params, (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error getting assignments:', err);
          return res.status(500).json({ success: false, message: 'Ошибка получения заданий' });
        }
        
        console.log('Raw assignments from DB:', rows.length);
        if (rows.length > 0) {
          console.log('Sample assignment:', rows[0]);
        }
        
        const assignments = rows.map(row => ({
          id: row.id,
          title: row.title,
          description: row.description,
          deadline: row.deadline,
          created_at: row.created_at,
          max_points: row.max_points || 100,
          subject_name: row.subject_name,
          teacher_name: row.teacher_name,
          status: row.status || 'pending',
          points: row.points,
          grade: row.grade,
          progress: row.progress
        }));
        
        console.log('Found assignments:', assignments.length);
        console.log('Assignments for user:', userId, 'groupId:', groupId);
        
        res.json({
          success: true,
          assignments: assignments
        });
      });
    });
    
  } catch (error) {
    console.error('Ошибка получения заданий:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение учебных материалов
router.get('/materials', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading materials for user:', userId);
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    // Получаем все активные материалы (materials не имеет group_id)
    db.all(`
      SELECT 
        m.id,
        m.title,
        m.description,
        m.file_path,
        m.file_url,
        m.file_type,
        m.file_size,
        m.type,
        m.created_at,
        s.name as subject_name,
        u.full_name as teacher_name
      FROM materials m
      LEFT JOIN subjects s ON m.subject_id = s.id
      LEFT JOIN users u ON m.teacher_id = u.id
      WHERE m.is_active = 1
      ORDER BY m.created_at DESC
    `, [], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting materials:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения материалов' });
      }
      
      const materials = rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        file_path: row.file_path,
        file_url: row.file_url,
        file_type: row.file_type,
        file_size: row.file_size,
        type: row.type,
        created_at: row.created_at,
        subject_name: row.subject_name,
        teacher_name: row.teacher_name
      }));
      
      console.log('Found materials:', materials.length);
      
      res.json({
        success: true,
        materials: materials
      });
    });
    
  } catch (error) {
    console.error('Ошибка получения материалов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение расписания
router.get('/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading schedule for user:', userId);
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    // Получаем группу студента через user_groups
    db.get('SELECT group_id FROM user_groups WHERE user_id = ? LIMIT 1', [userId], (err, userGroup) => {
      if (err) {
        db.close();
        console.error('Error getting user group:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения группы' });
      }
      
      const groupId = userGroup ? userGroup.group_id : null;
      
      if (!groupId) {
        db.close();
        return res.json({
          success: true,
          schedule: []
        });
      }
      
      db.all(`
        SELECT 
          sch.id,
          sch.day_of_week,
          sch.start_time,
          sch.end_time,
          sch.room,
          s.name as subject_name,
          u.full_name as teacher_name
        FROM schedule sch
        LEFT JOIN subjects s ON sch.subject_id = s.id
        LEFT JOIN users u ON sch.teacher_id = u.id
        WHERE sch.group_id = ? AND sch.is_active = 1
        ORDER BY sch.day_of_week, sch.start_time
      `, [groupId], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error getting schedule:', err);
          return res.status(500).json({ success: false, message: 'Ошибка получения расписания' });
        }
        
        const schedule = rows.map(row => ({
          id: row.id,
          day_of_week: row.day_of_week,
          time: `${row.start_time}-${row.end_time}`,
          start_time: row.start_time,
          end_time: row.end_time,
          room: row.room,
          subject_name: row.subject_name,
          teacher_name: row.teacher_name
        }));
        
        console.log('Found schedule items:', schedule.length);
        
        res.json({
          success: true,
          schedule: schedule
        });
      });
    });
    
  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение успеваемости
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading performance for user:', userId);
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        SUM(p.points) as total_points,
        SUM(p.max_points) as total_max_points,
        AVG(CAST(p.points as REAL) / CAST(p.max_points as REAL) * 100) as average_percent,
        COUNT(p.id) as count,
        (SELECT u.full_name FROM teacher_subjects ts 
         LEFT JOIN users u ON ts.teacher_id = u.id 
         WHERE ts.subject_id = s.id LIMIT 1) as teacher_name
      FROM performance p
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE p.student_id = ? AND p.max_points > 0
      GROUP BY p.subject_id
      ORDER BY s.name
    `, [userId], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting performance:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения успеваемости' });
      }
      
      const subjects = rows.map(row => ({
        subject_id: row.subject_id,
        name: row.subject_name || 'Предмет',
        teacher_name: row.teacher_name || 'Не указан',
        total_points: row.total_points || 0,
        total_max_points: row.total_max_points || 0,
        average_percent: Math.round((row.average_percent || 0) * 10) / 10,
        count: row.count
      }));
      
      console.log('Found performance for subjects:', subjects.length);
      console.log('Sample subject:', subjects[0]);
      
      res.json({
        success: true,
        performance: {
          subjects: subjects
        }
      });
    });
    
  } catch (error) {
    console.error('Ошибка получения успеваемости:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение посещаемости
router.get('/attendance', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Loading attendance for user:', userId);
    
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = require('path').join(__dirname, '../database/college.db');
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT 
        a.id,
        a.date,
        a.status,
        s.name as subject_name
      FROM attendance a
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
    `, [userId], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting attendance:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения посещаемости' });
      }
      
      const attendance = rows.map(row => ({
        id: row.id,
        date: row.date,
        status: row.status,
        subject_name: row.subject_name
      }));
      
      console.log('Found attendance records:', attendance.length);
      
      res.json({
        success: true,
        attendance: attendance
      });
    });
    
  } catch (error) {
    console.error('Ошибка получения посещаемости:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;

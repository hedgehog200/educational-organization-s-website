const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { dbOperations } = require('../database/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/college.db');

// Middleware для аутентификации через JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    if (req.session && req.session.userId) {
      req.userId = req.session.userId;
      req.userRole = req.session.userRole;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Недействительный токен' });
    req.userId = user.userId;
    req.userRole = user.role;
    next();
  });
};

// Middleware для проверки роли преподавателя или админа
const requireTeacherOrAdmin = (req, res, next) => {
  if (req.userRole !== 'teacher' && req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Недостаточно прав' });
  }
  next();
};

// ===================================
// СТАТИСТИКА ПРЕПОДАВАТЕЛЯ
// ===================================

// Получить статистику преподавателя
router.get('/stats', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    
    const db = new sqlite3.Database(dbPath);
    
    // Получаем статистику в одном запросе
    const stats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          (SELECT COUNT(*) FROM assignments WHERE teacher_id = ?) as totalAssignments,
          (SELECT COUNT(*) FROM materials WHERE teacher_id = ?) as totalMaterials,
          (SELECT COUNT(DISTINCT student_id) FROM performance WHERE subject_id IN (
            SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?
          )) as totalStudents,
          (SELECT ROUND(AVG(CAST(points as REAL) / CAST(max_points as REAL) * 100), 1) 
           FROM performance 
           WHERE subject_id IN (
             SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?
           ) AND max_points > 0) as averageGrade
      `, [teacher_id, teacher_id, teacher_id, teacher_id], (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Error getting teacher stats:', err);
          reject(err);
        } else {
          const result = rows[0] || {};
          resolve({
            totalAssignments: result.totalAssignments || 0,
            totalMaterials: result.totalMaterials || 0,
            totalStudents: result.totalStudents || 0,
            averageGrade: result.averageGrade || 0
          });
        }
      });
    });
    
    console.log('Teacher stats:', stats);
    res.json({ success: true, stats });
    
  } catch (error) {
    console.error('Error getting teacher stats:', error);
    res.status(500).json({ success: false, message: 'Ошибка получения статистики' });
  }
});

// ===================================
// ОЦЕНКИ (PERFORMANCE)
// ===================================

// Выставить оценку
router.post('/grades', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { student_id, subject_id, points, max_points, grade, comment, semester, academic_year } = req.body;
    const teacher_id = req.userId;

    console.log('Adding grade:', { student_id, subject_id, points, max_points, grade });

    const db = new sqlite3.Database(dbPath);
    
    db.run(`
      INSERT INTO performance (student_id, subject_id, points, max_points, grade, semester, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [student_id, subject_id, points, max_points, grade, semester || 1, academic_year || '2024-2025'], function(err) {
      db.close();
      
      if (err) {
        console.error('Error adding grade:', err);
        return res.status(500).json({ success: false, message: 'Ошибка при выставлении оценки' });
      }

      // Логирование активности
      dbOperations.addActivityLog({
        user_id: teacher_id,
        action_type: 'assignment_graded',
        action_description: `Выставлена оценка ${grade} студенту`,
        entity_type: 'grade',
        entity_id: this.lastID
      }).catch(err => console.error('Failed to log activity:', err));

      res.json({
        success: true,
        message: 'Оценка успешно выставлена',
        grade_id: this.lastID
      });
    });

  } catch (error) {
    console.error('Error in add grade:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить оценки (с фильтрами)
router.get('/grades', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { group_id, subject_id, student_id } = req.query;

    const db = new sqlite3.Database(dbPath);
    
    let query = `
      SELECT 
        p.*,
        u.full_name as student_name,
        u.group_name,
        s.name as subject_name
      FROM performance p
      LEFT JOIN users u ON p.student_id = u.id
      LEFT JOIN subjects s ON p.subject_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (student_id) {
      query += ' AND p.student_id = ?';
      params.push(student_id);
    }
    
    if (subject_id) {
      query += ' AND p.subject_id = ?';
      params.push(subject_id);
    }
    
    if (group_id) {
      query += ' AND u.group_name IN (SELECT name FROM groups WHERE id = ?)';
      params.push(group_id);
    }
    
    query += ' ORDER BY p.created_at DESC';

    db.all(query, params, (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting grades:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения оценок' });
      }

      res.json({
        success: true,
        grades: rows
      });
    });

  } catch (error) {
    console.error('Error in get grades:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// ===================================
// ПОСЕЩАЕМОСТЬ (ATTENDANCE)
// ===================================

// Отметить посещаемость
router.post('/attendance', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { attendance_records, group_id, subject_id, date, time } = req.body;
    const teacher_id = req.userId;

    console.log('Marking attendance:', { group_id, subject_id, date, records: attendance_records?.length });

    if (!attendance_records || !Array.isArray(attendance_records)) {
      return res.status(400).json({ success: false, message: 'Неверный формат данных' });
    }

    const db = new sqlite3.Database(dbPath);
    
    // Вставляем все записи
    const stmt = db.prepare(`
      INSERT INTO attendance (student_id, group_id, subject_id, date, time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let successCount = 0;
    
    for (const record of attendance_records) {
      stmt.run(
        record.student_id,
        group_id,
        subject_id,
        date,
        time,
        record.status || 'present',
        record.notes || null,
        (err) => {
          if (!err) successCount++;
        }
      );
    }

    stmt.finalize((err) => {
      db.close();
      
      if (err) {
        console.error('Error marking attendance:', err);
        return res.status(500).json({ success: false, message: 'Ошибка при отметке посещаемости' });
      }

      // Логирование активности
      dbOperations.addActivityLog({
        user_id: teacher_id,
        action_type: 'attendance_marked',
        action_description: `Отмечена посещаемость для ${attendance_records.length} студентов`,
        entity_type: 'attendance',
        entity_id: null
      }).catch(err => console.error('Failed to log activity:', err));

      res.json({
        success: true,
        message: `Посещаемость успешно отмечена для ${successCount} студентов`,
        count: successCount
      });
    });

  } catch (error) {
    console.error('Error in mark attendance:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить посещаемость (с фильтрами)
router.get('/attendance', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { group_id, subject_id, student_id, date_from, date_to } = req.query;

    const db = new sqlite3.Database(dbPath);
    
    let query = `
      SELECT 
        a.*,
        u.full_name as student_name,
        u.group_name,
        s.name as subject_name,
        g.name as group_full_name
      FROM attendance a
      LEFT JOIN users u ON a.student_id = u.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN groups g ON a.group_id = g.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (student_id) {
      query += ' AND a.student_id = ?';
      params.push(student_id);
    }
    
    if (subject_id) {
      query += ' AND a.subject_id = ?';
      params.push(subject_id);
    }
    
    if (group_id) {
      query += ' AND a.group_id = ?';
      params.push(group_id);
    }
    
    if (date_from) {
      query += ' AND a.date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND a.date <= ?';
      params.push(date_to);
    }
    
    query += ' ORDER BY a.date DESC, a.time DESC';

    db.all(query, params, (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting attendance:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения посещаемости' });
      }

      res.json({
        success: true,
        attendance: rows
      });
    });

  } catch (error) {
    console.error('Error in get attendance:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// ===================================
// ВСПОМОГАТЕЛЬНЫЕ ENDPOINTS
// ===================================

// Получить мои дисциплины (для преподавателя)
router.get('/my-subjects', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;

    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT 
        s.*,
        ts.created_at as assigned_at
      FROM teacher_subjects ts
      LEFT JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.teacher_id = ? AND s.is_active = 1
      ORDER BY s.name
    `, [teacher_id], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting teacher subjects:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения дисциплин' });
      }

      res.json({
        success: true,
        subjects: rows
      });
    });

  } catch (error) {
    console.error('Error in get my subjects:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить список групп
router.get('/groups', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const groups = await dbOperations.getGroups();
    res.json({
      success: true,
      groups: groups
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ success: false, message: 'Ошибка получения групп' });
  }
});

// Получить список студентов группы
router.get('/groups/:groupId/students', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT u.* 
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ? AND u.role = 'student' AND u.is_active = 1
      ORDER BY u.full_name
    `, [groupId], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting group students:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения студентов' });
      }

      res.json({
        success: true,
        students: rows
      });
    });

  } catch (error) {
    console.error('Error in get group students:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить список предметов
router.get('/subjects', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const subjects = await dbOperations.getSubjects();
    res.json({
      success: true,
      subjects: subjects
    });
  } catch (error) {
    console.error('Error getting subjects:', error);
    res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
  }
});

// ===================================
// ДАННЫЕ ПРЕПОДАВАТЕЛЯ
// ===================================

// Получить все задания преподавателя
router.get('/assignments', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT 
        a.*,
        COUNT(DISTINCT asub.id) as submissions_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.id END) as graded_count
      FROM assignments a
      LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
      WHERE a.teacher_id = ? AND a.is_active = 1
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `, [teacher_id], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting teacher assignments:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения заданий' });
      }

      res.json({
        success: true,
        assignments: rows
      });
    });

  } catch (error) {
    console.error('Error in get teacher assignments:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить все материалы преподавателя
router.get('/materials', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
      SELECT 
        m.*,
        s.name as subject_name
      FROM materials m
      LEFT JOIN subjects s ON m.subject_id = s.id
      WHERE m.teacher_id = ? AND m.is_active = 1
      ORDER BY m.created_at DESC
    `, [teacher_id], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting teacher materials:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения материалов' });
      }

      res.json({
        success: true,
        materials: rows
      });
    });

  } catch (error) {
    console.error('Error in get teacher materials:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить всех студентов преподавателя
router.get('/students', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    
    const db = new sqlite3.Database(dbPath);
    
    // Получаем всех активных студентов с их статистикой
    db.all(`
      SELECT DISTINCT
        u.id,
        u.email,
        u.full_name,
        u.group_name,
        u.specialty,
        u.is_active,
        u.created_at,
        (SELECT ROUND(AVG(CAST(p.points as REAL) / CAST(p.max_points as REAL) * 100), 1)
         FROM performance p
         WHERE p.student_id = u.id AND p.max_points > 0) as average_grade,
        (SELECT COUNT(*) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM attendance WHERE student_id = u.id), 0)
         FROM attendance
         WHERE student_id = u.id AND status = 'present') as attendance_rate
      FROM users u
      WHERE u.role = 'student' AND u.is_active = 1
      ORDER BY u.full_name
    `, [], (err, rows) => {
      db.close();
      
      if (err) {
        console.error('Error getting teacher students:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения студентов' });
      }

      res.json({
        success: true,
        users: rows
      });
    });

  } catch (error) {
    console.error('Error in get teacher students:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;


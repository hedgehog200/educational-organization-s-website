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
    
    // Оптимизированный запрос статистики - все параллельно
    const queries = [
      // 1. Задания
      new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM assignments WHERE teacher_id = ?', [teacher_id], (err, row) => {
          resolve(err ? 0 : (row?.count || 0));
        });
      }),
      // 2. Материалы
      new Promise((resolve) => {
        db.get('SELECT COUNT(*) as count FROM materials WHERE teacher_id = ?', [teacher_id], (err, row) => {
          resolve(err ? 0 : (row?.count || 0));
        });
      }),
      // 3. Студенты
      new Promise((resolve) => {
        db.get(`
          SELECT COUNT(DISTINCT ug.user_id) as count
          FROM user_groups ug
          INNER JOIN group_subjects gs ON ug.group_id = gs.group_id
          INNER JOIN teacher_subjects ts ON gs.subject_id = ts.subject_id
          WHERE ts.teacher_id = ?
        `, [teacher_id], (err, row) => {
          resolve(err ? 0 : (row?.count || 0));
        });
      }),
      // 4. Средний балл
      new Promise((resolve) => {
        db.get(`
          SELECT ROUND(AVG(CAST(points as REAL) / CAST(max_points as REAL) * 100), 1) as avg
          FROM performance 
          WHERE subject_id IN (SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?)
            AND max_points > 0
        `, [teacher_id], (err, row) => {
          resolve(err ? 0 : (row?.avg || 0));
        });
      })
    ];
    
    const [totalAssignments, totalMaterials, totalStudents, averageGrade] = await Promise.all(queries);
    
    db.close();
    
    const stats = {
      totalAssignments,
      totalMaterials,
      totalStudents,
      averageGrade
    };
    
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
    const { student_id, subject_id, assignment_id, points, max_points, grade, comment, semester, academic_year } = req.body;
    const teacher_id = req.userId;

    console.log('Adding grade:', { student_id, subject_id, assignment_id, points, max_points, grade });

    const db = new sqlite3.Database(dbPath);
    
    db.run(`
      INSERT INTO performance (student_id, subject_id, assignment_id, points, max_points, grade, semester, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, subject_id, assignment_id || null, points, max_points, grade, semester || 1, academic_year || '2024-2025'], function(err) {
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

// Удалить оценку
router.delete('/grades/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher_id = req.userId;

    const db = new sqlite3.Database(dbPath);
    
    // Проверяем существование оценки (можно добавить проверку владельца)
    db.get('SELECT * FROM performance WHERE id = ?', [id], (err, grade) => {
      if (err) {
        db.close();
        console.error('Error checking grade:', err);
        return res.status(500).json({ success: false, message: 'Ошибка проверки оценки' });
      }

      if (!grade) {
        db.close();
        return res.status(404).json({ success: false, message: 'Оценка не найдена' });
      }

      // Удаляем оценку
      db.run('DELETE FROM performance WHERE id = ?', [id], function(err) {
        db.close();
        
        if (err) {
          console.error('Error deleting grade:', err);
          return res.status(500).json({ success: false, message: 'Ошибка при удалении оценки' });
        }

        // Логирование активности
        dbOperations.addActivityLog({
          user_id: teacher_id,
          action_type: 'grade_deleted',
          action_description: `Удалена оценка #${id}`,
          entity_type: 'grade',
          entity_id: id
        }).catch(err => console.error('Failed to log activity:', err));

        res.json({
          success: true,
          message: 'Оценка успешно удалена'
        });
      });
    });

  } catch (error) {
    console.error('Error in delete grade:', error);
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
        s.name as subject_name,
        a.title as assignment_title
      FROM performance p
      LEFT JOIN users u ON p.student_id = u.id
      LEFT JOIN subjects s ON p.subject_id = s.id
      LEFT JOIN assignments a ON p.assignment_id = a.id
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
      if (err) {
        db.close();
        console.error('Error getting attendance:', err);
        return res.status(500).json({ success: false, message: 'Ошибка получения посещаемости' });
      }

      // Вычисляем статистику для карточек
      const teacher_id = req.userId;
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Общая посещаемость (процент присутствующих)
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count
        FROM attendance a
        INNER JOIN user_groups ug ON a.student_id = ug.user_id
        INNER JOIN group_subjects gs ON ug.group_id = gs.group_id
        INNER JOIN teacher_subjects ts ON gs.subject_id = ts.subject_id
        WHERE ts.teacher_id = ?
      `, [teacher_id], (err, overallStats) => {
        
        // Студентов отмечено сегодня
        db.get(`
          SELECT COUNT(DISTINCT student_id) as students_today
          FROM attendance a
          INNER JOIN user_groups ug ON a.student_id = ug.user_id
          INNER JOIN group_subjects gs ON ug.group_id = gs.group_id
          INNER JOIN teacher_subjects ts ON gs.subject_id = ts.subject_id
          WHERE a.date = ? AND ts.teacher_id = ?
        `, [today, teacher_id], (err, todayStats) => {
          
          // Пропусков за неделю
          db.get(`
            SELECT COUNT(*) as absences_week
            FROM attendance a
            INNER JOIN user_groups ug ON a.student_id = ug.user_id
            INNER JOIN group_subjects gs ON ug.group_id = gs.group_id
            INNER JOIN teacher_subjects ts ON gs.subject_id = ts.subject_id
            WHERE a.date >= ? 
              AND a.status IN ('absent', 'excused')
              AND ts.teacher_id = ?
          `, [weekAgo, teacher_id], (err, weekStats) => {
            db.close();
            
            const stats = {
              overallRate: overallStats && overallStats.total > 0 
                ? Math.round((overallStats.present_count / overallStats.total) * 100) 
                : 0,
              studentsToday: todayStats ? todayStats.students_today : 0,
              absencesThisWeek: weekStats ? weekStats.absences_week : 0
            };

            res.json({
              success: true,
              attendance: rows,
              stats: stats
            });
          });
        });
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

// Получить последнюю активность преподавателя
router.get('/activity', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    const limit = parseInt(req.query.limit) || 10;
    
    const activities = await dbOperations.getUserActivity(teacher_id, limit);
    
    // Форматируем активность для frontend
    const formattedActivities = activities.map(a => {
      let icon = 'fa-info-circle';
      
      // Определяем иконку по типу действия
      switch (a.action_type) {
        case 'assignment_created':
          icon = 'fa-tasks';
          break;
        case 'assignment_graded':
        case 'grade_added':
          icon = 'fa-star';
          break;
        case 'material_created':
          icon = 'fa-file-alt';
          break;
        case 'attendance_marked':
          icon = 'fa-check-circle';
          break;
        case 'assignment_deleted':
        case 'material_deleted':
          icon = 'fa-trash';
          break;
        default:
          icon = 'fa-info-circle';
      }
      
      return {
        id: a.id,
        type: a.action_type,
        description: a.action_description,
        time: a.created_at,
        icon: icon
      };
    });
    
    res.json({
      success: true,
      activities: formattedActivities
    });
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ success: false, message: 'Ошибка получения активности' });
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
    const teacher_id = req.userId;
    const userRole = req.userRole;

    // Если администратор - показываем все предметы
    if (userRole === 'admin') {
      const subjects = await dbOperations.getSubjects();
      return res.json({
        success: true,
        subjects: subjects
      });
    }

    // Если преподаватель - показываем только назначенные ему предметы
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
        return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
      }

      res.json({
        success: true,
        subjects: rows
      });
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
        s.name as subject_name,
        g.name as group_name,
        COUNT(DISTINCT asub.id) as submissions_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.id END) as graded_count
      FROM assignments a
      LEFT JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN groups g ON a.group_id = g.id
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

// Создать задание
router.post('/assignments', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, subject, group, description, deadline, max_points } = req.body;
    const teacher_id = req.userId;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });
    }

    const maxPoints = parseInt(max_points) || 100;

    console.log('Creating assignment:', { title, subject, group, deadline, max_points: maxPoints });

    const db = new sqlite3.Database(dbPath);
    
    db.run(`
      INSERT INTO assignments (teacher_id, subject_id, group_id, title, description, deadline, max_points, is_published, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `, [teacher_id, subject || null, group || null, title, description || null, deadline, maxPoints], function(err) {
      db.close();
      
      if (err) {
        console.error('Error creating assignment:', err);
        return res.status(500).json({ success: false, message: 'Ошибка при создании задания' });
      }

      // Логирование активности
      dbOperations.addActivityLog({
        user_id: teacher_id,
        action_type: 'assignment_created',
        action_description: `Создано задание: ${title} (${maxPoints} баллов)`,
        entity_type: 'assignment',
        entity_id: this.lastID
      }).catch(err => console.error('Failed to log activity:', err));

      res.json({
        success: true,
        message: 'Задание успешно создано',
        assignment_id: this.lastID
      });
    });

  } catch (error) {
    console.error('Error in create assignment:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Редактировать задание
router.put('/assignments/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, group, description, deadline, max_points } = req.body;
    const teacher_id = req.userId;

    if (!title || !deadline) {
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });
    }

    const maxPoints = parseInt(max_points) || 100;

    const db = new sqlite3.Database(dbPath);
    
    // Проверяем, что задание существует и принадлежит преподавателю (или пользователь админ)
    db.get('SELECT * FROM assignments WHERE id = ?', [id], (err, assignment) => {
      if (err) {
        db.close();
        console.error('Error checking assignment:', err);
        return res.status(500).json({ success: false, message: 'Ошибка проверки задания' });
      }

      if (!assignment) {
        db.close();
        return res.status(404).json({ success: false, message: 'Задание не найдено' });
      }

      // Проверка прав: только создатель или админ может редактировать
      if (assignment.teacher_id !== teacher_id && req.userRole !== 'admin') {
        db.close();
        return res.status(403).json({ success: false, message: 'Недостаточно прав' });
      }

      // Обновляем задание
      db.run(`
        UPDATE assignments 
        SET title = ?, subject_id = ?, group_id = ?, description = ?, deadline = ?, max_points = ?
        WHERE id = ?
      `, [title, subject || null, group || null, description || null, deadline, maxPoints, id], function(err) {
        db.close();
        
        if (err) {
          console.error('Error updating assignment:', err);
          return res.status(500).json({ success: false, message: 'Ошибка при обновлении задания' });
        }

        // Логирование активности
        dbOperations.addActivityLog({
          user_id: teacher_id,
          action_type: 'assignment_updated',
          action_description: `Обновлено задание: ${title}`,
          entity_type: 'assignment',
          entity_id: id
        }).catch(err => console.error('Failed to log activity:', err));

        res.json({
          success: true,
          message: 'Задание успешно обновлено'
        });
      });
    });

  } catch (error) {
    console.error('Error in update assignment:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Удалить задание
router.delete('/assignments/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher_id = req.userId;

    const db = new sqlite3.Database(dbPath);
    
    // Проверяем, что задание принадлежит преподавателю
    db.get('SELECT * FROM assignments WHERE id = ? AND teacher_id = ?', [id, teacher_id], (err, assignment) => {
      if (err) {
        db.close();
        console.error('Error checking assignment:', err);
        return res.status(500).json({ success: false, message: 'Ошибка проверки задания' });
      }

      if (!assignment) {
        db.close();
        return res.status(404).json({ success: false, message: 'Задание не найдено' });
      }

      // Мягкое удаление - помечаем как неактивное
      db.run('UPDATE assignments SET is_active = 0 WHERE id = ?', [id], function(err) {
        db.close();
        
        if (err) {
          console.error('Error deleting assignment:', err);
          return res.status(500).json({ success: false, message: 'Ошибка при удалении задания' });
        }

        // Логирование активности
        dbOperations.addActivityLog({
          user_id: teacher_id,
          action_type: 'assignment_deleted',
          action_description: `Удалено задание: ${assignment.title}`,
          entity_type: 'assignment',
          entity_id: id
        }).catch(err => console.error('Failed to log activity:', err));

        res.json({
          success: true,
          message: 'Задание успешно удалено'
        });
      });
    });

  } catch (error) {
    console.error('Error in delete assignment:', error);
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

// Создать материал
router.post('/materials', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    const { title, subject, description, file_url } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });
    }

    console.log('Creating material:', { title, subject, description, file_url });

    const db = new sqlite3.Database(dbPath);
    
    db.run(`
      INSERT INTO materials (teacher_id, subject_id, title, description, file_url, type, is_active)
      VALUES (?, ?, ?, ?, ?, 'document', 1)
    `, [teacher_id, subject || null, title, description || null, file_url || null], function(err) {
      db.close();
      
      if (err) {
        console.error('Error creating material:', err);
        return res.status(500).json({ success: false, message: 'Ошибка при создании материала' });
      }

      // Логирование активности
      dbOperations.addActivityLog({
        user_id: teacher_id,
        action_type: 'material_created',
        action_description: `Создан материал: ${title}`,
        entity_type: 'material',
        entity_id: this.lastID
      }).catch(err => console.error('Failed to log activity:', err));

      res.json({
        success: true,
        message: 'Материал успешно добавлен',
        material_id: this.lastID
      });
    });

  } catch (error) {
    console.error('Error in create material:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Редактировать материал
router.put('/materials/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, description, file_url } = req.body;
    const teacher_id = req.userId;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });
    }

    const db = new sqlite3.Database(dbPath);
    
    // Проверяем, что материал существует и принадлежит преподавателю (или пользователь админ)
    db.get('SELECT * FROM materials WHERE id = ?', [id], (err, material) => {
      if (err) {
        db.close();
        console.error('Error checking material:', err);
        return res.status(500).json({ success: false, message: 'Ошибка проверки материала' });
      }

      if (!material) {
        db.close();
        return res.status(404).json({ success: false, message: 'Материал не найден' });
      }

      // Проверка прав: только создатель или админ может редактировать
      if (material.teacher_id !== teacher_id && req.userRole !== 'admin') {
        db.close();
        return res.status(403).json({ success: false, message: 'Недостаточно прав' });
      }

      // Обновляем материал
      db.run(`
        UPDATE materials 
        SET title = ?, subject_id = ?, description = ?, file_url = ?
        WHERE id = ?
      `, [title, subject || null, description || null, file_url || null, id], function(err) {
        db.close();
        
        if (err) {
          console.error('Error updating material:', err);
          return res.status(500).json({ success: false, message: 'Ошибка при обновлении материала' });
        }

        // Логирование активности
        dbOperations.addActivityLog({
          user_id: teacher_id,
          action_type: 'material_updated',
          action_description: `Обновлен материал: ${title}`,
          entity_type: 'material',
          entity_id: id
        }).catch(err => console.error('Failed to log activity:', err));

        res.json({
          success: true,
          message: 'Материал успешно обновлён'
        });
      });
    });

  } catch (error) {
    console.error('Error in update material:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Удалить материал
router.delete('/materials/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher_id = req.userId;

    const db = new sqlite3.Database(dbPath);
    
    // Проверяем, что материал принадлежит преподавателю
    db.get('SELECT * FROM materials WHERE id = ? AND teacher_id = ?', [id, teacher_id], (err, material) => {
      if (err) {
        db.close();
        console.error('Error checking material:', err);
        return res.status(500).json({ success: false, message: 'Ошибка проверки материала' });
      }

      if (!material) {
        db.close();
        return res.status(404).json({ success: false, message: 'Материал не найден' });
      }

      // Мягкое удаление - помечаем как неактивное
      db.run('UPDATE materials SET is_active = 0 WHERE id = ?', [id], function(err) {
        db.close();
        
        if (err) {
          console.error('Error deleting material:', err);
          return res.status(500).json({ success: false, message: 'Ошибка при удалении материала' });
        }

        // Логирование активности
        dbOperations.addActivityLog({
          user_id: teacher_id,
          action_type: 'material_deleted',
          action_description: `Удалён материал: ${material.title}`,
          entity_type: 'material',
          entity_id: id
        }).catch(err => console.error('Failed to log activity:', err));

        res.json({
          success: true,
          message: 'Материал успешно удалён'
        });
      });
    });

  } catch (error) {
    console.error('Error in delete material:', error);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
  }
});

// Получить всех студентов преподавателя
router.get('/students', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const teacher_id = req.userId;
    
    const db = new sqlite3.Database(dbPath);
    
    // Получаем студентов, у которых преподаватель ведет предметы (через группы)
    db.all(`
      SELECT DISTINCT
        u.id,
        u.email,
        u.full_name,
        u.group_name,
        g.name as group_full_name,
        u.specialty,
        u.is_active,
        u.created_at,
        (SELECT ROUND(AVG(CAST(p.points as REAL) / CAST(p.max_points as REAL) * 100), 1)
         FROM performance p
         INNER JOIN teacher_subjects ts ON p.subject_id = ts.subject_id
         WHERE p.student_id = u.id AND p.max_points > 0 AND ts.teacher_id = ?) as average_grade,
        (SELECT COUNT(*) * 100.0 / NULLIF(
          (SELECT COUNT(*) FROM attendance WHERE student_id = u.id), 0)
         FROM attendance
         WHERE student_id = u.id AND status = 'present') as attendance_rate
      FROM users u
      INNER JOIN user_groups ug ON u.id = ug.user_id
      INNER JOIN groups g ON ug.group_id = g.id
      INNER JOIN group_subjects gs ON g.id = gs.group_id
      INNER JOIN teacher_subjects ts ON gs.subject_id = ts.subject_id
      WHERE u.role = 'student' 
        AND u.is_active = 1 
        AND ts.teacher_id = ?
      ORDER BY u.full_name
    `, [teacher_id, teacher_id], (err, rows) => {
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


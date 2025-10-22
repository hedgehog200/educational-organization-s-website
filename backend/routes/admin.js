const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { dbOperations } = require('../database/database');
const config = require('../config');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/college.db');

// Middleware для проверки прав администратора
const requireAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Проверяем, что пользователь является администратором через dbOperations
        const user = await dbOperations.findUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
                    return res.status(403).json({ success: false, message: 'Недостаточно прав' });
                }
                
                req.userId = decoded.userId;
                next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Недействительный токен' });
    }
};

// Получить всех пользователей
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await dbOperations.getAllUsers();
        res.json({ success: true, users: users });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения пользователей' });
    }
});

// Получить пользователя по ID
router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;
        const user = await dbOperations.findUserById(id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        res.json({ success: true, user: user });
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения пользователя' });
    }
});

// Создать нового пользователя (студента или преподавателя)
router.post('/users', requireAdmin, async (req, res) => {
    try {
    const { email, password, full_name, role, specialty, group_name } = req.body;
    
    if (!email || !password || !full_name || !role) {
        return res.status(400).json({ 
            success: false, 
            message: 'Необходимо заполнить все обязательные поля' 
        });
    }
    
    if (!['student', 'teacher', 'admin'].includes(role)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Недопустимая роль пользователя' 
        });
    }
    
    // Проверяем, существует ли пользователь с таким email
        const existingUser = await dbOperations.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Пользователь с таким email уже существует' });
        }
        
        // Создаем пользователя через dbOperations
        const newUser = await dbOperations.createUser({
            email,
            password,
            full_name,
            role,
            specialty: specialty || null,
            group_name: group_name || null
        });
        
                res.json({ 
                    success: true, 
                    message: 'Пользователь успешно создан',
            userId: newUser.id
        });
        
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка создания пользователя' });
    }
});

// Обновить пользователя
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;
    const { email, full_name, role, specialty, group_name, is_active, password } = req.body;
    
    console.log('Updating user:', id, 'with data:', { email, full_name, role, specialty, group_name, is_active });
    
    // Проверяем, существует ли пользователь
        const existingUser = await dbOperations.findUserById(id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Подготавливаем данные для обновления
        const updateData = {
            email,
            full_name,
            role,
            // Если specialty пустая строка, устанавливаем null
            specialty: specialty && specialty.trim() !== '' ? specialty : null,
            // Если group_name пустая строка, устанавливаем null
            group_name: group_name && group_name.trim() !== '' ? group_name : null,
            is_active
        };
        
        // Если пароль предоставлен, хешируем его
        if (password && password.trim() !== '') {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            updateData.password = hashedPassword;
        }
        
        // Обновляем пользователя через dbOperations
        const result = await dbOperations.updateUser(id, updateData);
        
        console.log('Update result:', result);
        
        if (result.success) {
            res.json({ success: true, message: 'Пользователь успешно обновлен' });
        } else {
            console.error('Update failed:', result);
            res.status(500).json({ success: false, message: 'Ошибка обновления пользователя' });
        }
        
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка обновления пользователя: ' + error.message });
    }
});

// Удалить пользователя
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;
    
    // Проверяем, что не удаляем самих себя
    if (parseInt(id) === parseInt(req.userId)) {
        return res.status(400).json({ success: false, message: 'Нельзя удалить самого себя' });
    }
    
    // Проверяем, существует ли пользователь
        const existingUser = await dbOperations.findUserById(id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        
        // Удаляем пользователя через dbOperations
        const result = await dbOperations.deleteUser(id);
        
        if (result.success) {
            res.json({ success: true, message: 'Пользователь успешно удален' });
        } else {
            res.status(500).json({ success: false, message: 'Ошибка удаления пользователя' });
        }
        
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ success: false, message: 'Ошибка удаления пользователя' });
    }
});

// Получить статистику системы
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const stats = await dbOperations.getStats();
        res.json({
            success: true,
            stats: {
                total: stats.total,
                students: stats.students,
                teachers: stats.teachers,
                admins: stats.admins,
                groups: stats.groups,
                subjects: stats.subjects,
                materials: stats.materials,
                assignments: stats.assignments
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения статистики' });
    }
});

// Получить последние активности
router.get('/activity', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activities = await dbOperations.getRecentActivity(limit);
        
        res.json({
            success: true,
            activities: activities
        });
    } catch (error) {
        console.error('Ошибка получения активности:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения активности' });
    }
});

// Сбросить пароль пользователя
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Новый пароль не указан' 
            });
        }
        
        // ИСПРАВЛЕНО: Валидация пароля
        if (newPassword.length < 12) {
            return res.status(400).json({
                success: false,
                message: 'Пароль должен содержать минимум 12 символов'
            });
        }
        
        // ИСПРАВЛЕНО: Использование dbOperations вместо прямого SQL
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await dbOperations.updateUser(id, { password: hashedPassword });
        
        if (result.success) {
            console.log(`[SECURITY] Password reset by admin for user ${id}`);
            res.json({ success: true, message: 'Пароль успешно сброшен' });
        } else {
            res.status(500).json({ success: false, message: 'Ошибка обновления пароля' });
        }
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({ success: false, message: 'Ошибка сброса пароля' });
    }
});

// ===== ГРУППЫ =====

// Получить все группы
router.get('/groups', requireAdmin, async (req, res) => {
    try {
        const groups = await dbOperations.getAllGroups();
        res.json({ success: true, groups: groups });
    } catch (error) {
        console.error('Ошибка получения групп:', error);
        res.status(500).json({ success: false, message: 'Ошибка получения групп' });
    }
});

// Получить студентов группы по имени группы
router.get('/groups/:groupName/students', requireAdmin, (req, res) => {
    const { groupName } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    console.log('Loading students for group:', groupName);
    
    db.all(`
        SELECT id, full_name, email, specialty, group_name
        FROM users
        WHERE role = 'student' AND group_name = ? AND is_active = 1
        ORDER BY full_name
    `, [groupName], (err, students) => {
        db.close();
        
        if (err) {
            console.error('Error loading students for group:', err);
            return res.status(500).json({ success: false, message: 'Ошибка получения студентов группы' });
        }
        
        console.log('Found students:', students.length);
        res.json({ success: true, students: students });
    });
});

// Получить группу по ID
router.get('/groups/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    db.get(`
        SELECT g.*, COUNT(ug.user_id) as student_count
        FROM groups g
        LEFT JOIN user_groups ug ON g.id = ug.group_id
        WHERE g.id = ?
        GROUP BY g.id
    `, [id], (err, group) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка получения группы' });
        }
        
        if (!group) {
            db.close();
            return res.status(404).json({ success: false, message: 'Группа не найдена' });
        }
        
        // Получаем студентов группы
        db.all(`
            SELECT u.id, u.full_name, u.email
            FROM users u
            JOIN user_groups ug ON u.id = ug.user_id
            WHERE ug.group_id = ?
        `, [id], (err, students) => {
            if (err) {
                db.close();
                return res.status(500).json({ success: false, message: 'Ошибка получения студентов группы' });
            }
            
            db.close();
            res.json({ success: true, group: { ...group, students } });
        });
    });
});

// Создать группу
router.post('/groups', requireAdmin, (req, res) => {
    const { name, specialty, year, description, student_ids } = req.body;
    
    if (!name || !specialty || !year) {
        return res.status(400).json({ 
            success: false, 
            message: 'Необходимо заполнить все обязательные поля' 
        });
    }
    
    const db = new sqlite3.Database(dbPath);
    
    // Создаем группу
    db.run(`
        INSERT INTO groups (name, specialty, year, description, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
    `, [name, specialty, year, description || null], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка создания группы' });
        }
        
        const groupId = this.lastID;
        
        // Добавляем студентов в группу
        if (student_ids && student_ids.length > 0) {
            const insertPromises = student_ids.map(studentId => 
                new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO user_groups (user_id, group_id, created_at)
                        VALUES (?, ?, datetime('now'))
                    `, [studentId, groupId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                })
            );
            
            Promise.all(insertPromises).then(() => {
                db.close();
                res.json({ 
                    success: true, 
                    message: 'Группа успешно создана',
                    groupId: groupId
                });
            }).catch(err => {
                db.close();
                res.status(500).json({ success: false, message: 'Ошибка добавления студентов в группу' });
            });
        } else {
            db.close();
            res.json({ 
                success: true, 
                message: 'Группа успешно создана',
                groupId: groupId
            });
        }
    });
});

// Обновить группу
router.put('/groups/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, specialty, year, description, student_ids } = req.body;
    
    const db = new sqlite3.Database(dbPath);
    
    // Обновляем группу
    db.run(`
        UPDATE groups 
        SET name = ?, specialty = ?, year = ?, description = ?
        WHERE id = ?
    `, [name, specialty, year, description, id], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка обновления группы' });
        }
        
        // Обновляем студентов группы
        if (student_ids !== undefined) {
            // Удаляем старых студентов
            db.run('DELETE FROM user_groups WHERE group_id = ?', [id], (err) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ success: false, message: 'Ошибка обновления студентов группы' });
                }
                
                // Добавляем новых студентов
                if (student_ids.length > 0) {
                    const insertPromises = student_ids.map(studentId => 
                        new Promise((resolve, reject) => {
                            db.run(`
                                INSERT INTO user_groups (user_id, group_id, created_at)
                                VALUES (?, ?, datetime('now'))
                            `, [studentId, id], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        })
                    );
                    
                    Promise.all(insertPromises).then(() => {
                        db.close();
                        res.json({ success: true, message: 'Группа успешно обновлена' });
                    }).catch(err => {
                        db.close();
                        res.status(500).json({ success: false, message: 'Ошибка добавления студентов в группу' });
                    });
                } else {
                    db.close();
                    res.json({ success: true, message: 'Группа успешно обновлена' });
                }
            });
        } else {
            db.close();
            res.json({ success: true, message: 'Группа успешно обновлена' });
        }
    });
});

// Удалить группу
router.delete('/groups/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    // Удаляем связи студентов с группой
    db.run('DELETE FROM user_groups WHERE group_id = ?', [id], (err) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка удаления связей группы' });
        }
        
        // Удаляем группу
        db.run('DELETE FROM groups WHERE id = ?', [id], function(err) {
            if (err) {
                db.close();
                return res.status(500).json({ success: false, message: 'Ошибка удаления группы' });
            }
            
            db.close();
            res.json({ success: true, message: 'Группа успешно удалена' });
        });
    });
});

// Получить статистику групп
router.get('/groups/stats', requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const queries = [
        'SELECT COUNT(*) as totalGroups FROM groups',
        'SELECT COUNT(*) as totalStudents FROM user_groups',
        'SELECT COUNT(*) as activeGroups FROM groups WHERE is_active = 1'
    ];
    
    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve(Object.values(row)[0] || 0);
            });
        })
    )).then(([totalGroups, totalStudents, activeGroups]) => {
        // Вычисляем средний размер группы отдельно
        const avgGroupSize = totalGroups > 0 ? totalStudents / totalGroups : 0;
        
        db.close();
        res.json({
            success: true,
            stats: {
                totalGroups,
                totalStudents,
                avgGroupSize: Math.round(avgGroupSize * 100) / 100,
                activeGroups
            }
        });
    }).catch(err => {
        db.close();
        res.status(500).json({ success: false, message: 'Ошибка получения статистики групп' });
    });
});

// Получить всех студентов
router.get('/students', requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT id, full_name, email, specialty, group_name
        FROM users 
        WHERE role = 'student' AND is_active = 1
        ORDER BY full_name
    `, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка получения студентов' });
        }
        
        db.close();
        res.json({ success: true, students: rows });
    });
});

// ===== ПОСЕЩАЕМОСТЬ =====

// Получить данные посещаемости
router.get('/attendance', requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT a.*, u.full_name as student_name, g.name as group_name, s.name as subject_name
        FROM attendance a
        LEFT JOIN users u ON a.student_id = u.id
        LEFT JOIN groups g ON a.group_id = g.id
        LEFT JOIN subjects s ON a.subject_id = s.id
        ORDER BY a.date DESC, a.time DESC
    `, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка получения данных посещаемости' });
        }
        
        db.close();
        res.json({ success: true, attendance: rows });
    });
});

// Получить статистику посещаемости
router.get('/attendance/stats', requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const queries = [
        'SELECT AVG(CASE WHEN status = "present" THEN 100 ELSE 0 END) as overallAttendance FROM attendance',
        `SELECT COUNT(DISTINCT student_id) as studentsToday FROM attendance WHERE date = ? AND status = "present"`,
        `SELECT COUNT(*) as absencesThisWeek FROM attendance WHERE date >= ? AND status = "absent"`,
        'SELECT COUNT(*) as latenessCount FROM attendance WHERE status = "late"'
    ];
    
    Promise.all(queries.map((query, index) => 
        new Promise((resolve, reject) => {
            const params = index === 1 ? [today] : index === 2 ? [weekAgo] : [];
            db.get(query, params, (err, row) => {
                if (err) reject(err);
                else resolve(Object.values(row)[0] || 0);
            });
        })
    )).then(([overallAttendance, studentsToday, absencesThisWeek, latenessCount]) => {
        db.close();
        res.json({
            success: true,
            stats: {
                overallAttendance: Math.round(overallAttendance * 100) / 100,
                studentsToday,
                absencesThisWeek,
                latenessCount
            }
        });
    }).catch(err => {
        db.close();
        res.status(500).json({ success: false, message: 'Ошибка получения статистики посещаемости' });
    });
});

// Получить предметы
router.get('/subjects', requireAdmin, (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT id, name, description
        FROM subjects 
        WHERE is_active = 1
        ORDER BY name
    `, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка получения предметов' });
        }
        
        db.close();
        res.json({ success: true, subjects: rows });
    });
});

// Удалить запись посещаемости
router.delete('/attendance/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = new sqlite3.Database(dbPath);
    
    db.run('DELETE FROM attendance WHERE id = ?', [id], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, message: 'Ошибка удаления записи посещаемости' });
        }
        
        db.close();
        res.json({ success: true, message: 'Запись посещаемости успешно удалена' });
    });
});

// ===================================
// УПРАВЛЕНИЕ ДИСЦИПЛИНАМИ
// ===================================

// Создать дисциплину
router.post('/subjects', requireAdmin, async (req, res) => {
    try {
        const { name, description, credits } = req.body;
        const admin_id = req.userId;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Название дисциплины обязательно' });
        }

        const db = new sqlite3.Database(dbPath);
        
        db.run(`
            INSERT INTO subjects (name, description, credits, is_active)
            VALUES (?, ?, ?, 1)
        `, [name, description || '', credits || 0], function(err) {
            db.close();
            
            if (err) {
                console.error('Error creating subject:', err);
                return res.status(500).json({ success: false, message: 'Ошибка создания дисциплины' });
            }

            // Логирование
            dbOperations.addActivityLog({
                user_id: admin_id,
                action_type: 'subject_created',
                action_description: `Создана дисциплина "${name}"`,
                entity_type: 'subject',
                entity_id: this.lastID
            }).catch(err => console.error('Failed to log activity:', err));

            res.json({
                success: true,
                message: 'Дисциплина успешно создана',
                subject_id: this.lastID
            });
        });

    } catch (error) {
        console.error('Error in create subject:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Обновить дисциплину
router.put('/subjects/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, credits, is_active } = req.body;

        const db = new sqlite3.Database(dbPath);
        
        db.run(`
            UPDATE subjects 
            SET name = ?, description = ?, credits = ?, is_active = ?
            WHERE id = ?
        `, [name, description, credits, is_active, id], function(err) {
            db.close();
            
            if (err) {
                console.error('Error updating subject:', err);
                return res.status(500).json({ success: false, message: 'Ошибка обновления дисциплины' });
            }

            res.json({
                success: true,
                message: 'Дисциплина успешно обновлена'
            });
        });

    } catch (error) {
        console.error('Error in update subject:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Удалить дисциплину
router.delete('/subjects/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const db = new sqlite3.Database(dbPath);
        
        // Мягкое удаление (деактивация)
        db.run(`
            UPDATE subjects SET is_active = 0 WHERE id = ?
        `, [id], function(err) {
            db.close();
            
            if (err) {
                console.error('Error deleting subject:', err);
                return res.status(500).json({ success: false, message: 'Ошибка удаления дисциплины' });
            }

            res.json({
                success: true,
                message: 'Дисциплина успешно удалена'
            });
        });

    } catch (error) {
        console.error('Error in delete subject:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Назначить преподавателя на дисциплину
router.post('/subjects/:id/assign', requireAdmin, async (req, res) => {
    try {
        const { id: subject_id } = req.params;
        const { teacher_id } = req.body;
        const admin_id = req.userId;

        if (!teacher_id) {
            return res.status(400).json({ success: false, message: 'ID преподавателя обязателен' });
        }

        // Проверяем, что пользователь является преподавателем
        const teacher = await dbOperations.findUserById(teacher_id);
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return res.status(400).json({ success: false, message: 'Указанный пользователь не является преподавателем' });
        }

        const db = new sqlite3.Database(dbPath);
        
        db.run(`
            INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id, assigned_by)
            VALUES (?, ?, ?)
        `, [teacher_id, subject_id, admin_id], function(err) {
            if (err) {
                db.close();
                console.error('Error assigning teacher to subject:', err);
                return res.status(500).json({ success: false, message: 'Ошибка назначения преподавателя' });
            }

            // Получаем информацию о дисциплине для логирования
            db.get('SELECT name FROM subjects WHERE id = ?', [subject_id], (err2, subject) => {
                db.close();
                
                if (!err2 && subject) {
                    // Логирование
                    dbOperations.addActivityLog({
                        user_id: admin_id,
                        action_type: 'teacher_assigned',
                        action_description: `Преподаватель ${teacher.full_name} назначен на дисциплину "${subject.name}"`,
                        entity_type: 'teacher_subject',
                        entity_id: this.lastID
                    }).catch(err => console.error('Failed to log activity:', err));
                }

                res.json({
                    success: true,
                    message: 'Преподаватель успешно назначен на дисциплину'
                });
            });
        });

    } catch (error) {
        console.error('Error in assign teacher:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Получить преподавателей дисциплины
router.get('/subjects/:id/teachers', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const db = new sqlite3.Database(dbPath);
        
        db.all(`
            SELECT 
                ts.*,
                u.full_name as teacher_name,
                u.email as teacher_email,
                admin.full_name as assigned_by_name
            FROM teacher_subjects ts
            LEFT JOIN users u ON ts.teacher_id = u.id
            LEFT JOIN users admin ON ts.assigned_by = admin.id
            WHERE ts.subject_id = ?
            ORDER BY ts.created_at DESC
        `, [id], (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error getting subject teachers:', err);
                return res.status(500).json({ success: false, message: 'Ошибка получения преподавателей' });
            }

            res.json({
                success: true,
                teachers: rows
            });
        });

    } catch (error) {
        console.error('Error in get subject teachers:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Убрать преподавателя с дисциплины
router.delete('/subjects/:subjectId/teachers/:teacherId', requireAdmin, async (req, res) => {
    try {
        const { subjectId, teacherId } = req.params;

        const db = new sqlite3.Database(dbPath);
        
        db.run(`
            DELETE FROM teacher_subjects 
            WHERE subject_id = ? AND teacher_id = ?
        `, [subjectId, teacherId], function(err) {
            db.close();
            
            if (err) {
                console.error('Error removing teacher from subject:', err);
                return res.status(500).json({ success: false, message: 'Ошибка удаления назначения' });
            }

            res.json({
                success: true,
                message: 'Преподаватель успешно убран с дисциплины'
            });
        });

    } catch (error) {
        console.error('Error in remove teacher assignment:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Получить все дисциплины с информацией о преподавателях
router.get('/subjects-detailed', requireAdmin, async (req, res) => {
    try {
        const db = new sqlite3.Database(dbPath);
        
        db.all(`
            SELECT 
                s.*,
                GROUP_CONCAT(u.full_name, ', ') as teachers
            FROM subjects s
            LEFT JOIN teacher_subjects ts ON s.id = ts.subject_id
            LEFT JOIN users u ON ts.teacher_id = u.id
            WHERE s.is_active = 1
            GROUP BY s.id
            ORDER BY s.name
        `, (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error getting detailed subjects:', err);
                return res.status(500).json({ success: false, message: 'Ошибка получения дисциплин' });
            }

            res.json({
                success: true,
                subjects: rows
            });
        });

    } catch (error) {
        console.error('Error in get detailed subjects:', error);
        res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

module.exports = router;

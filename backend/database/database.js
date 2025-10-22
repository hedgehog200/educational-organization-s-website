const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'college.db');

// Создание подключения к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к базе данных SQLite успешно');
        initializeDatabase();
    }
});

// Инициализация базы данных
function initializeDatabase() {
    const tables = [
        // Пользователи
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            specialty TEXT,
            role TEXT DEFAULT 'student',
            group_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )`,
        
        // Группы
        `CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialty TEXT,
            year TEXT,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Связи пользователей и групп
        `CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            group_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (group_id) REFERENCES groups (id)
        )`,
        
        // Предметы/Дисциплины
        `CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            credits INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Расписание
        `CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            subject_id INTEGER,
            teacher_id INTEGER,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            room TEXT,
            week_type TEXT DEFAULT 'all',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (teacher_id) REFERENCES users (id)
        )`,
        
        // Материалы
        `CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            subject_id INTEGER,
            teacher_id INTEGER,
            file_path TEXT,
            file_type TEXT,
            file_size INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (teacher_id) REFERENCES users (id)
        )`,
        
        // Задания
        `CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            subject TEXT NOT NULL,
            teacher_id INTEGER NOT NULL,
            file_path TEXT,
            file_type TEXT,
            file_size INTEGER,
            deadline DATETIME,
            max_points INTEGER DEFAULT 100,
            is_published INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users (id)
        )`,
        
        // Сдача заданий
        `CREATE TABLE IF NOT EXISTS assignment_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id INTEGER,
            student_id INTEGER,
            submission_text TEXT,
            file_path TEXT,
            points INTEGER,
            feedback TEXT,
            status TEXT DEFAULT 'submitted',
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            graded_at DATETIME,
            FOREIGN KEY (assignment_id) REFERENCES assignments (id),
            FOREIGN KEY (student_id) REFERENCES users (id)
        )`,
        
        // Посещаемость
        `CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            group_id INTEGER,
            subject_id INTEGER,
            date DATE NOT NULL,
            time TIME,
            status TEXT DEFAULT 'present',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users (id),
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )`,
        
        // Успеваемость
        `CREATE TABLE IF NOT EXISTS performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            subject_id INTEGER,
            assignment_id INTEGER,
            points INTEGER,
            max_points INTEGER,
            grade TEXT,
            semester INTEGER,
            academic_year TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (assignment_id) REFERENCES assignments (id)
        )`,
        
        // Уведомления
        `CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,
        
        // Новости
        `CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id INTEGER,
            is_published INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users (id)
        )`,
        
        // Логи активности (для админ панели)
        `CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action_type TEXT NOT NULL,
            action_description TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`,
        
        // Связь преподавателей и дисциплин
        `CREATE TABLE IF NOT EXISTS teacher_subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            assigned_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (teacher_id) REFERENCES users (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id),
            FOREIGN KEY (assigned_by) REFERENCES users (id),
            UNIQUE(teacher_id, subject_id)
        )`
    ];

    // Создаем все таблицы
    tables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`Ошибка создания таблицы ${index + 1}:`, err.message);
            } else {
                console.log(`Таблица ${index + 1} создана/проверена`);
            }
        });
    });

    // Создание администратора по умолчанию (с задержкой, чтобы таблицы успели создаться)
    setTimeout(() => {
        createDefaultData();
    }, 2000);
}

// Создание данных по умолчанию
function createDefaultData() {
    // Создание администратора
    const adminEmail = 'admin@college.ru';
    
    // КРИТИЧНО: Генерируем случайный пароль или берем из переменной окружения
    // const crypto = require('crypto');
    // const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    
    // ВРЕМЕННО: Фиксированный пароль для отладки (потом включить генерацию!)
    const adminPassword = 'admin123';
    

    db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (err) {
            console.error('Ошибка проверки администратора:', err.message);
            return;
        }
        
        if (!row) {
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            db.run(`
                INSERT INTO users (email, password, full_name, role, is_active)
                VALUES (?, ?, ?, 'admin', 1)
            `, [adminEmail, hashedPassword, 'Администратор'], function(err) {
                if (err) {
                    console.error('Ошибка создания администратора:', err.message);
                } else {
                    console.log('\n✅ Администратор создан:');
                    console.log('   Email:', adminEmail);
                    console.log('   Пароль:', adminPassword);
                    console.log('');
                }
            });
        }
    });

    // Создание тестовых групп
    const groups = [
        { name: 'ИБАСкд-232', specialty: 'Информационная безопасность автоматизированных систем', year: '2023' },
        { name: 'ИБАСкф-231', specialty: 'Информационная безопасность автоматизированных систем', year: '2023' },
        { name: 'ИСП-232', specialty: 'Информационные системы и программирование', year: '2023' }
    ];

    groups.forEach(group => {
        db.get('SELECT id FROM groups WHERE name = ?', [group.name], (err, row) => {
            if (!err && !row) {
                db.run(`
                    INSERT INTO groups (name, specialty, year, description)
                    VALUES (?, ?, ?, ?)
                `, [group.name, group.specialty, group.year, `Группа ${group.name}`]);
            }
        });
    });

    // Создание тестовых предметов
    const subjects = [
        { name: 'Программирование', description: 'Основы программирования', credits: 4 },
        { name: 'Базы данных', description: 'Проектирование и администрирование БД', credits: 3 },
        { name: 'Веб-разработка', description: 'Создание веб-приложений', credits: 4 },
        { name: 'Математика', description: 'Высшая математика', credits: 5 },
        { name: 'Экономика', description: 'Основы экономики', credits: 3 }
    ];

    subjects.forEach(subject => {
        db.get('SELECT id FROM subjects WHERE name = ?', [subject.name], (err, row) => {
            if (!err && !row) {
                db.run(`
                    INSERT INTO subjects (name, description, credits)
                    VALUES (?, ?, ?)
                `, [subject.name, subject.description, subject.credits]);
            }
        });
    });
}

// Экспорт операций с базой данных
const dbOperations = {
    // === ПОЛЬЗОВАТЕЛИ ===
    createUser: (userData) => {
        return new Promise((resolve, reject) => {
            const { full_name, email, password, specialty, role = 'student', group_name } = userData;
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.run(`
                INSERT INTO users (email, password, full_name, specialty, role, group_name, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
            `, [email, hashedPassword, full_name, specialty, role, group_name], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        email,
                        full_name,
                        specialty,
                        role,
                        group_name
                    });
                }
            });
        });
    },

    findUserByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    findUserById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    getAllUsers: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT u.*, g.name as group_name 
                FROM users u 
                LEFT JOIN groups g ON u.group_name = g.name 
                ORDER BY u.created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    getUsersByRole: (role) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT u.*, g.name as group_name 
                FROM users u 
                LEFT JOIN groups g ON u.group_name = g.name 
                WHERE u.role = ? 
                ORDER BY u.created_at DESC
            `, [role], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    updateUser: (id, userData) => {
        return new Promise((resolve, reject) => {
            const { email, full_name, specialty, role, group_name, is_active, password } = userData;
            
            console.log('Database updateUser called with:', { id, email, full_name, specialty, role, group_name, is_active });
            
            // Подготавливаем поля для обновления
            let updateFields = [];
            let updateValues = [];
            
            if (email !== undefined) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }
            if (full_name !== undefined) {
                updateFields.push('full_name = ?');
                updateValues.push(full_name);
            }
            if (role !== undefined) {
                updateFields.push('role = ?');
                updateValues.push(role);
            }
            if (specialty !== undefined) {
                updateFields.push('specialty = ?');
                updateValues.push(specialty);
            }
            if (group_name !== undefined) {
                updateFields.push('group_name = ?');
                updateValues.push(group_name);
            }
            if (is_active !== undefined) {
                updateFields.push('is_active = ?');
                updateValues.push(is_active ? 1 : 0);
            }
            if (password !== undefined) {
                updateFields.push('password = ?');
                updateValues.push(password);
            }
            
            if (updateFields.length === 0) {
                resolve({ success: true, changes: 0 });
                return;
            }
            
            updateValues.push(id);
            
            const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
            
            console.log('Executing SQL:', sql);
            console.log('With values:', updateValues);
            
            db.run(sql, updateValues, function(err) {
                if (err) {
                    console.error('SQL error:', err);
                    reject(err);
                } else {
                    console.log('SQL success, rows changed:', this.changes);
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    deleteUser: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    updateLastLogin: (userId) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },

    // === ГРУППЫ ===
    createGroup: (groupData) => {
        return new Promise((resolve, reject) => {
            const { name, specialty, year, description } = groupData;
            db.run(`
                INSERT INTO groups (name, specialty, year, description, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, datetime('now'))
            `, [name, specialty, year, description], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        name,
                        specialty,
                        year,
                        description
                    });
                }
            });
        });
    },

    getAllGroups: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT g.*, COUNT(ug.user_id) as student_count
                FROM groups g
                LEFT JOIN user_groups ug ON g.id = ug.group_id
                GROUP BY g.id
                ORDER BY g.created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    getGroupById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM groups WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    updateGroup: (id, groupData) => {
        return new Promise((resolve, reject) => {
            const { name, specialty, year, description } = groupData;
            db.run(`
                UPDATE groups 
                SET name = ?, specialty = ?, year = ?, description = ?
                WHERE id = ?
            `, [name, specialty, year, description, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    deleteGroup: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM groups WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // === ПРЕДМЕТЫ ===
    getAllSubjects: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM subjects WHERE is_active = 1 ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createSubject: (subjectData) => {
        return new Promise((resolve, reject) => {
            const { name, description, credits } = subjectData;
            db.run(`
                INSERT INTO subjects (name, description, credits, is_active, created_at)
                VALUES (?, ?, ?, 1, datetime('now'))
            `, [name, description, credits], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        name,
                        description,
                        credits
                    });
                }
            });
        });
    },

    // === РАСПИСАНИЕ ===
    getSchedule: (groupId, weekType = 'all') => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT s.*, sub.name as subject_name, u.full_name as teacher_name
                FROM schedule s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN users u ON s.teacher_id = u.id
                WHERE s.group_id = ? AND (s.week_type = ? OR s.week_type = 'all')
                ORDER BY s.day_of_week, s.start_time
            `, [groupId, weekType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createScheduleItem: (scheduleData) => {
        return new Promise((resolve, reject) => {
            const { group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type } = scheduleData;
            db.run(`
                INSERT INTO schedule (group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            `, [group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type
                    });
                }
            });
        });
    },

    // === МАТЕРИАЛЫ ===
    getMaterials: (subjectId = null) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT m.*, s.name as subject_name, u.full_name as teacher_name
                FROM materials m
                LEFT JOIN subjects s ON m.subject_id = s.id
                LEFT JOIN users u ON m.teacher_id = u.id
                WHERE m.is_active = 1
            `;
            let params = [];
            
            if (subjectId) {
                sql += ' AND m.subject_id = ?';
                params.push(subjectId);
            }
            
            sql += ' ORDER BY m.created_at DESC';
            
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createMaterial: (materialData) => {
        return new Promise((resolve, reject) => {
            const { title, description, subject_id, teacher_id, file_path, file_type, file_size } = materialData;
            db.run(`
                INSERT INTO materials (title, description, subject_id, teacher_id, file_path, file_type, file_size, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            `, [title, description, subject_id, teacher_id, file_path, file_type, file_size], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        title, description, subject_id, teacher_id, file_path, file_type, file_size
                    });
                }
            });
        });
    },

    // === ЗАДАНИЯ ===
    getAssignments: (groupId = null, studentId = null) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT a.*, s.name as subject_name, u.full_name as teacher_name, g.name as group_name
                FROM assignments a
                LEFT JOIN subjects s ON a.subject_id = s.id
                LEFT JOIN users u ON a.teacher_id = u.id
                LEFT JOIN groups g ON a.group_id = g.id
                WHERE a.is_active = 1
            `;
            let params = [];
            
            if (groupId) {
                sql += ' AND a.group_id = ?';
                params.push(groupId);
            }
            
            sql += ' ORDER BY a.due_date ASC';
            
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createAssignment: (assignmentData) => {
        return new Promise((resolve, reject) => {
            const { title, description, subject_id, teacher_id, group_id, due_date, max_points } = assignmentData;
            db.run(`
                INSERT INTO assignments (title, description, subject_id, teacher_id, group_id, due_date, max_points, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            `, [title, description, subject_id, teacher_id, group_id, due_date, max_points], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        title, description, subject_id, teacher_id, group_id, due_date, max_points
                    });
                }
            });
        });
    },

    // === ПОСЕЩАЕМОСТЬ ===
    getAttendance: (groupId = null, studentId = null, date = null) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT a.*, u.full_name as student_name, g.name as group_name, s.name as subject_name
                FROM attendance a
                LEFT JOIN users u ON a.student_id = u.id
                LEFT JOIN groups g ON a.group_id = g.id
                LEFT JOIN subjects s ON a.subject_id = s.id
                WHERE 1=1
            `;
            let params = [];
            
            if (groupId) {
                sql += ' AND a.group_id = ?';
                params.push(groupId);
            }
            if (studentId) {
                sql += ' AND a.student_id = ?';
                params.push(studentId);
            }
            if (date) {
                sql += ' AND a.date = ?';
                params.push(date);
            }
            
            sql += ' ORDER BY a.date DESC, a.time DESC';
            
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createAttendance: (attendanceData) => {
        return new Promise((resolve, reject) => {
            const { student_id, group_id, subject_id, date, time, status, notes } = attendanceData;
            db.run(`
                INSERT INTO attendance (student_id, group_id, subject_id, date, time, status, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [student_id, group_id, subject_id, date, time, status, notes], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        student_id, group_id, subject_id, date, time, status, notes
                    });
                }
            });
        });
    },

    // === УСПЕВАЕМОСТЬ ===
    getPerformance: (studentId, subjectId = null) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT p.*, s.name as subject_name, a.title as assignment_title
                FROM performance p
                LEFT JOIN subjects s ON p.subject_id = s.id
                LEFT JOIN assignments a ON p.assignment_id = a.id
                WHERE p.student_id = ?
            `;
            let params = [studentId];
            
            if (subjectId) {
                sql += ' AND p.subject_id = ?';
                params.push(subjectId);
            }
            
            sql += ' ORDER BY p.created_at DESC';
            
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // === УВЕДОМЛЕНИЯ ===
    getNotifications: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM notifications 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 50
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createNotification: (notificationData) => {
        return new Promise((resolve, reject) => {
            const { user_id, title, message, type = 'info' } = notificationData;
            db.run(`
                INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                VALUES (?, ?, ?, ?, 0, datetime('now'))
            `, [user_id, title, message, type], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        user_id, title, message, type
                    });
                }
            });
        });
    },

    // === СТАТИСТИКА ===
    getStats: () => {
        return new Promise((resolve, reject) => {
            const queries = [
                'SELECT COUNT(*) as total FROM users',
                'SELECT COUNT(*) as students FROM users WHERE role = "student"',
                'SELECT COUNT(*) as teachers FROM users WHERE role = "teacher"',
                'SELECT COUNT(*) as admins FROM users WHERE role = "admin"',
                'SELECT COUNT(*) as groups FROM groups',
                'SELECT COUNT(*) as subjects FROM subjects',
                'SELECT COUNT(*) as materials FROM materials',
                'SELECT COUNT(*) as assignments FROM assignments'
            ];
            
            Promise.all(queries.map(query => 
                new Promise((resolve, reject) => {
                    db.get(query, (err, row) => {
                        if (err) reject(err);
                        else resolve(Object.values(row)[0]);
                    });
                })
            )).then(([total, students, teachers, admins, groups, subjects, materials, assignments]) => {
                resolve({
                    total, students, teachers, admins, groups, subjects, materials, assignments
                });
            }).catch(reject);
        });
    },

    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===
    
    // Обновить материал
    updateMaterial: (id, materialData) => {
        return new Promise((resolve, reject) => {
            const { title, description, subject_id } = materialData;
            db.run(`
                UPDATE materials 
                SET title = ?, description = ?, subject_id = ?
                WHERE id = ?
            `, [title, description, subject_id, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Удалить материал
    deleteMaterial: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM materials WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Обновить задание
    updateAssignment: (id, assignmentData) => {
        return new Promise((resolve, reject) => {
            const { title, description, due_date, max_points } = assignmentData;
            db.run(`
                UPDATE assignments 
                SET title = ?, description = ?, due_date = ?, max_points = ?
                WHERE id = ?
            `, [title, description, due_date, max_points, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Удалить задание
    deleteAssignment: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM assignments WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Создать сдачу задания
    createSubmission: (submissionData) => {
        return new Promise((resolve, reject) => {
            const { assignment_id, student_id, submission_text, file_path, status } = submissionData;
            db.run(`
                INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_path, status, submitted_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `, [assignment_id, student_id, submission_text, file_path, status], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        assignment_id, student_id, submission_text, file_path, status
                    });
                }
            });
        });
    },

    // Получить сдачи заданий
    getSubmissions: (assignmentId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT s.*, u.full_name as student_name, u.email as student_email
                FROM assignment_submissions s
                LEFT JOIN users u ON s.student_id = u.id
                WHERE s.assignment_id = ?
                ORDER BY s.submitted_at DESC
            `, [assignmentId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Оценить задание
    gradeSubmission: (submissionId, points, feedback) => {
        return new Promise((resolve, reject) => {
            db.run(`
                UPDATE assignment_submissions 
                SET points = ?, feedback = ?, graded_at = datetime('now')
                WHERE id = ?
            `, [points, feedback, submissionId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Обновить элемент расписания
    updateScheduleItem: (id, scheduleData) => {
        return new Promise((resolve, reject) => {
            const { group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type } = scheduleData;
            db.run(`
                UPDATE schedule 
                SET group_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ?, week_type = ?
                WHERE id = ?
            `, [group_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, week_type, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Удалить элемент расписания
    deleteScheduleItem: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM schedule WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Получить расписание преподавателя
    getTeacherSchedule: (teacherId, weekType = 'all') => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT s.*, sub.name as subject_name, g.name as group_name
                FROM schedule s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN groups g ON s.group_id = g.id
                WHERE s.teacher_id = ? AND (s.week_type = ? OR s.week_type = 'all')
                ORDER BY s.day_of_week, s.start_time
            `, [teacherId, weekType], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ АДМИН-ПАНЕЛИ ===
    
    // Получить всех пользователей
    getAllUsers: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT u.*, g.name as group_name
                FROM users u
                LEFT JOIN user_groups ug ON u.id = ug.user_id
                LEFT JOIN groups g ON ug.group_id = g.id
                ORDER BY u.created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },


    // Удалить пользователя
    deleteUser: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Получить все группы
    getAllGroups: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT g.*, COUNT(ug.user_id) as student_count
                FROM groups g
                LEFT JOIN user_groups ug ON g.id = ug.group_id
                GROUP BY g.id
                ORDER BY g.name
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Создать группу
    createGroup: (groupData) => {
        return new Promise((resolve, reject) => {
            const { name, specialty, course } = groupData;
            db.run(`
                INSERT INTO groups (name, specialty, course, created_at)
                VALUES (?, ?, ?, datetime('now'))
            `, [name, specialty, course], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        name, specialty, course
                    });
                }
            });
        });
    },

    // Найти группу по ID
    findGroupById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM groups WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Обновить группу
    updateGroup: (id, groupData) => {
        return new Promise((resolve, reject) => {
            const { name, specialty, course } = groupData;
            db.run(`
                UPDATE groups 
                SET name = ?, specialty = ?, course = ?
                WHERE id = ?
            `, [name, specialty, course, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Удалить группу
    deleteGroup: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM groups WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Получить все предметы
    getAllSubjects: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM subjects ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Создать предмет
    createSubject: (subjectData) => {
        return new Promise((resolve, reject) => {
            const { name, description, credits } = subjectData;
            db.run(`
                INSERT INTO subjects (name, description, credits, created_at)
                VALUES (?, ?, ?, datetime('now'))
            `, [name, description, credits], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        name, description, credits
                    });
                }
            });
        });
    },

    // Найти предмет по ID
    findSubjectById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM subjects WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Обновить предмет
    updateSubject: (id, subjectData) => {
        return new Promise((resolve, reject) => {
            const { name, description, credits } = subjectData;
            db.run(`
                UPDATE subjects 
                SET name = ?, description = ?, credits = ?
                WHERE id = ?
            `, [name, description, credits, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Удалить предмет
    deleteSubject: (id) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM subjects WHERE id = ?', [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    },

    // Получить всех преподавателей
    getAllTeachers: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT u.*, GROUP_CONCAT(s.name) as subjects
                FROM users u
                LEFT JOIN teacher_subjects ts ON u.id = ts.teacher_id
                LEFT JOIN subjects s ON ts.subject_id = s.id
                WHERE u.role = 'teacher'
                GROUP BY u.id
                ORDER BY u.full_name
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Преобразуем строку subjects в массив
                    rows.forEach(row => {
                        if (row.subjects) {
                            row.subjects = row.subjects.split(',').map(s => ({ name: s.trim() }));
                        } else {
                            row.subjects = [];
                        }
                    });
                    resolve(rows);
                }
            });
        });
    },

    // Получить все расписание
    getAllSchedule: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT s.*, sub.name as subject_name, g.name as group_name, u.full_name as teacher_name
                FROM schedule s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN groups g ON s.group_id = g.id
                LEFT JOIN users u ON s.teacher_id = u.id
                ORDER BY s.day_of_week, s.start_time
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Группируем по дням недели
                    const grouped = {};
                    rows.forEach(row => {
                        if (!grouped[row.day_of_week]) {
                            grouped[row.day_of_week] = [];
                        }
                        grouped[row.day_of_week].push(row);
                    });
                    resolve(grouped);
                }
            });
        });
    },

    // Получить все материалы
    getAllMaterials: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT m.*, s.name as subject_name, u.full_name as teacher_name
                FROM materials m
                LEFT JOIN subjects s ON m.subject_id = s.id
                LEFT JOIN users u ON m.teacher_id = u.id
                ORDER BY m.created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

      // Получить все задания
      getAllAssignments: () => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT a.*, s.name as subject_name, u.full_name as teacher_name
                  FROM assignments a
                  LEFT JOIN subjects s ON a.subject_id = s.id
                  LEFT JOIN users u ON a.teacher_id = u.id
                  ORDER BY a.created_at DESC
              `, (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ УСПЕВАЕМОСТИ ===
      
      // Добавить оценку
      addGrade: (gradeData) => {
          return new Promise((resolve, reject) => {
              const { student_id, subject_id, assignment_id, points, max_points, grade, semester, academic_year } = gradeData;
              
              db.run(`
                  INSERT INTO performance (student_id, subject_id, assignment_id, points, max_points, grade, semester, academic_year, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `, [student_id, subject_id, assignment_id, points, max_points, grade, semester, academic_year], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve({
                          id: this.lastID,
                          student_id, subject_id, assignment_id, points, max_points, grade, semester, academic_year
                      });
                  }
              });
          });
      },

      // Получить оценки студента
      getStudentGrades: (studentId, subjectId = null) => {
          return new Promise((resolve, reject) => {
              let sql = `
                  SELECT p.*, s.name as subject_name, a.title as assignment_title
                  FROM performance p
                  LEFT JOIN subjects s ON p.subject_id = s.id
                  LEFT JOIN assignments a ON p.assignment_id = a.id
                  WHERE p.student_id = ?
              `;
              let params = [studentId];
              
              if (subjectId) {
                  sql += ' AND p.subject_id = ?';
                  params.push(subjectId);
              }
              
              sql += ' ORDER BY p.created_at DESC';
              
              db.all(sql, params, (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // Обновить оценку
      updateGrade: (gradeId, gradeData) => {
          return new Promise((resolve, reject) => {
              const { points, max_points, grade, feedback } = gradeData;
              
              db.run(`
                  UPDATE performance 
                  SET points = ?, max_points = ?, grade = ?, feedback = ?
                  WHERE id = ?
              `, [points, max_points, grade, feedback, gradeId], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve({ success: true, changes: this.changes });
                  }
              });
          });
      },

      // Удалить оценку
      deleteGrade: (gradeId) => {
          return new Promise((resolve, reject) => {
              db.run('DELETE FROM performance WHERE id = ?', [gradeId], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve({ success: true, changes: this.changes });
                  }
              });
          });
      },

      // === ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАДАНИЯМИ ===

      // Получить все задания
      getAssignments: () => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT a.*, u.full_name as teacher_name
                  FROM assignments a
                  LEFT JOIN users u ON a.teacher_id = u.id
                  WHERE a.is_active = 1
                  ORDER BY a.created_at DESC
              `, (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // Получить задание по ID
      getAssignmentById: (assignmentId) => {
          return new Promise((resolve, reject) => {
              db.get(`
                  SELECT a.*, u.full_name as teacher_name
                  FROM assignments a
                  LEFT JOIN users u ON a.teacher_id = u.id
                  WHERE a.id = ? AND a.is_active = 1
              `, [assignmentId], (err, row) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(row);
                  }
              });
          });
      },

      // Создать новое задание
      createAssignment: (assignmentData) => {
          return new Promise((resolve, reject) => {
              const { title, description, subject, teacher_id, file_path, file_type, deadline, max_points, is_published } = assignmentData;
              
              db.run(`
                  INSERT INTO assignments (title, description, subject, teacher_id, file_path, file_type, deadline, max_points, is_published)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [title, description, subject, teacher_id, file_path, file_type, deadline, max_points, is_published], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      // Получаем созданное задание
                      db.get(`
                          SELECT a.*, u.full_name as teacher_name
                          FROM assignments a
                          LEFT JOIN users u ON a.teacher_id = u.id
                          WHERE a.id = ?
                      `, [this.lastID], (err, row) => {
                          if (err) {
                              reject(err);
                          } else {
                              resolve(row);
                          }
                      });
                  }
              });
          });
      },

      // Обновить задание
      updateAssignment: (assignmentId, updateData) => {
          return new Promise((resolve, reject) => {
              const fields = [];
              const values = [];
              
              Object.keys(updateData).forEach(key => {
                  fields.push(`${key} = ?`);
                  values.push(updateData[key]);
              });
              
              values.push(assignmentId);
              
              db.run(`
                  UPDATE assignments 
                  SET ${fields.join(', ')}
                  WHERE id = ?
              `, values, function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      if (this.changes > 0) {
                          // Получаем обновленное задание
                          db.get(`
                              SELECT a.*, u.full_name as teacher_name
                              FROM assignments a
                              LEFT JOIN users u ON a.teacher_id = u.id
                              WHERE a.id = ?
                          `, [assignmentId], (err, row) => {
                              if (err) {
                                  reject(err);
                              } else {
                                  resolve({ success: true, assignment: row });
                              }
                          });
                      } else {
                          resolve({ success: false, message: 'Задание не найдено' });
                      }
                  }
              });
          });
      },

      // Удалить задание
      deleteAssignment: (assignmentId) => {
          return new Promise((resolve, reject) => {
              db.run('UPDATE assignments SET is_active = 0 WHERE id = ?', [assignmentId], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve({ success: true, changes: this.changes });
                  }
              });
          });
      },

      // Получить задания преподавателя
      getTeacherAssignments: (teacherId) => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT a.*, u.full_name as teacher_name
                  FROM assignments a
                  LEFT JOIN users u ON a.teacher_id = u.id
                  WHERE a.teacher_id = ? AND a.is_active = 1
                  ORDER BY a.created_at DESC
              `, [teacherId], (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // Получить опубликованные задания
      getPublishedAssignments: () => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT a.*, u.full_name as teacher_name
                  FROM assignments a
                  LEFT JOIN users u ON a.teacher_id = u.id
                  WHERE a.is_published = 1 AND a.is_active = 1
                  ORDER BY a.created_at DESC
              `, (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // ЛОГИ АКТИВНОСТИ

      // Добавить лог активности
      addActivityLog: (activityData) => {
          return new Promise((resolve, reject) => {
              const { user_id, action_type, action_description, entity_type, entity_id, ip_address } = activityData;
              
              db.run(`
                  INSERT INTO activity_logs (user_id, action_type, action_description, entity_type, entity_id, ip_address)
                  VALUES (?, ?, ?, ?, ?, ?)
              `, [user_id, action_type, action_description, entity_type, entity_id, ip_address], function(err) {
                  if (err) {
                      reject(err);
                  } else {
                      resolve({ id: this.lastID });
                  }
              });
          });
      },

      // Получить последние логи активности
      getRecentActivity: (limit = 10) => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT 
                      al.*,
                      u.full_name as user_name,
                      u.role as user_role
                  FROM activity_logs al
                  LEFT JOIN users u ON al.user_id = u.id
                  ORDER BY al.created_at DESC
                  LIMIT ?
              `, [limit], (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      },

      // Получить активность конкретного пользователя
      getUserActivity: (userId, limit = 10) => {
          return new Promise((resolve, reject) => {
              db.all(`
                  SELECT * FROM activity_logs
                  WHERE user_id = ?
                  ORDER BY created_at DESC
                  LIMIT ?
              `, [userId, limit], (err, rows) => {
                  if (err) {
                      reject(err);
                  } else {
                      resolve(rows);
                  }
              });
          });
      }
  };

  module.exports = { dbOperations };
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');  // ДОБАВЛЕНО: для безопасной генерации имен файлов
const { dbOperations } = require('../database/database');
const config = require('../config');

const router = express.Router();

// Настройка multer для загрузки файлов заданий
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../uploads/assignments');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (error) {
      console.error('Ошибка создания директории для загрузки:', error);
      cb(new Error('Ошибка создания директории для загрузки'), null);
    }
  },
  filename: (req, file, cb) => {
    try {
      // ИСПРАВЛЕНО: Используем crypto для безопасной генерации имени
      const userId = req.session?.userId || 'anonymous';
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Формат: userId-timestamp-randomHash.ext
      const filename = `${userId}-${timestamp}-${randomBytes}${ext}`;
      
      console.log(`[SECURITY] Generated secure filename: ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error('Ошибка генерации имени файла:', error);
      cb(new Error('Ошибка генерации имени файла'), null);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    try {
      const allowedTypes = config.upload.allowedTypes;
      const allowedMimeTypes = config.upload.allowedMimeTypes;
      const ext = path.extname(file.originalname).toLowerCase();
      
      // ИСПРАВЛЕНО: Проверяем И расширение И MIME тип
      const isExtensionAllowed = allowedTypes.includes(ext);
      const isMimeTypeAllowed = allowedMimeTypes.includes(file.mimetype);
      
      if (isExtensionAllowed && isMimeTypeAllowed) {
        cb(null, true);
      } else {
        console.log(`[SECURITY] Rejected file: ${file.originalname} (ext: ${ext}, MIME: ${file.mimetype})`);
        cb(new Error(`Недопустимый тип файла. Разрешены: ${allowedTypes.join(', ')}`), false);
      }
    } catch (error) {
      console.error('Ошибка фильтрации файла:', error);
      cb(new Error('Ошибка проверки типа файла'), false);
    }
  }
});

// Middleware для обработки ошибок multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Файл слишком большой. Максимальный размер: ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Ошибка загрузки файла: ' + error.message
    });
  }
  
  if (error.message.includes('Неподдерживаемый тип файла')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Получение всех заданий (только опубликованные для студентов)
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRole = req.session.userRole || 'student';
    const { subject, status } = req.query;
    
    const filters = {};
    if (subject) filters.subject = subject;
    if (status) filters.status = status;
    
    const assignments = await dbOperations.getAssignments();
    
    // Для студентов показываем только опубликованные задания
    let filteredAssignments = assignments;
    if (userRole === 'student') {
      filteredAssignments = assignments.filter(assignment => 
        assignment.is_published === 1
      );
    }
    
    // Фильтрация по предмету
    if (subject && subject !== 'all') {
      filteredAssignments = filteredAssignments.filter(assignment => 
        assignment.subject === subject
      );
    }

    res.json({
      success: true,
      assignments: filteredAssignments
    });

  } catch (error) {
    console.error('Ошибка получения заданий:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение задания по ID
router.get('/:id', async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userRole = req.session.userRole || 'student';
    
    const assignments = await dbOperations.getAssignments();
    const assignment = assignments.find(a => a.id == assignmentId);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }

    // Студенты могут видеть только опубликованные задания
    if (userRole === 'student' && assignment.is_published !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Задание не опубликовано'
      });
    }

    res.json({
      success: true,
      assignment: assignment
    });

  } catch (error) {
    console.error('Ошибка получения задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Создание нового задания (только для преподавателей)
router.post('/', upload.single('file'), handleUploadError, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRole = req.session.userRole;
    
    // Проверяем, что пользователь - преподаватель
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для создания задания'
      });
    }
    
    const { 
      title, 
      description, 
      subject, 
      deadline, 
      max_points,
      is_published = '0' // По умолчанию не опубликовано
    } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл задания не загружен'
      });
    }

    const filePath = `/uploads/assignments/${req.file.filename}`;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    const assignmentData = {
      title,
      description,
      file_path: filePath,
      file_type: fileType,
      subject,
      deadline: new Date(deadline),
      max_points: parseInt(max_points) || 100,
      teacher_id: userId,
      is_published: is_published === '1' ? 1 : 0,
      created_at: new Date()
    };

    const newAssignment = await dbOperations.createAssignment(assignmentData);

    res.json({
      success: true,
      message: 'Задание успешно создано',
      assignment: newAssignment
    });

  } catch (error) {
    console.error('Ошибка создания задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Публикация/скрытие задания (только для преподавателей)
router.put('/:id/publish', async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.userRole;
    const { is_published } = req.body;
    
    // Проверяем права
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для изменения статуса задания'
      });
    }
    
    const assignments = await dbOperations.getAssignments();
    const assignment = assignments.find(a => a.id == assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }
    
    // Проверяем, что задание принадлежит преподавателю (или админ)
    if (userRole !== 'admin' && assignment.teacher_id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Вы можете изменять только свои задания'
      });
    }

    const result = await dbOperations.updateAssignment(assignmentId, {
      is_published: is_published ? 1 : 0
    });

    if (result.success) {
      res.json({
        success: true,
        message: is_published ? 'Задание опубликовано' : 'Задание скрыто',
        assignment: result.assignment
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка обновления задания'
      });
    }

  } catch (error) {
    console.error('Ошибка публикации задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Обновление задания (только для преподавателей)
router.put('/:id', async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.userRole;
    const { title, description, subject, deadline, max_points } = req.body;
    
    // Проверяем права
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для редактирования задания'
      });
    }
    
    const assignments = await dbOperations.getAssignments();
    const assignment = assignments.find(a => a.id == assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }
    
    // Проверяем, что задание принадлежит преподавателю (или админ)
    if (userRole !== 'admin' && assignment.teacher_id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Вы можете редактировать только свои задания'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (subject) updateData.subject = subject;
    if (deadline) updateData.deadline = new Date(deadline);
    if (max_points) updateData.max_points = parseInt(max_points);

    const result = await dbOperations.updateAssignment(assignmentId, updateData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Задание успешно обновлено',
        assignment: result.assignment
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка обновления задания'
      });
    }

  } catch (error) {
    console.error('Ошибка обновления задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление задания (только для преподавателей)
router.delete('/:id', async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.userRole;
    
    // Проверяем права
    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для удаления задания'
      });
    }
    
    const assignments = await dbOperations.getAssignments();
    const assignment = assignments.find(a => a.id == assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }
    
    // Проверяем, что задание принадлежит преподавателю (или админ)
    if (userRole !== 'admin' && assignment.teacher_id != userId) {
      return res.status(403).json({
        success: false,
        message: 'Вы можете удалять только свои задания'
      });
    }

    // Удаление файла с диска
    if (assignment.file_path) {
      const filePath = path.join(__dirname, '..', assignment.file_path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Файл задания удален: ${filePath}`);
        } catch (fileError) {
          console.error('Ошибка удаления файла задания:', fileError);
        }
      }
    }

    const result = await dbOperations.deleteAssignment(assignmentId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Задание успешно удалено'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка удаления задания'
      });
    }

  } catch (error) {
    console.error('Ошибка удаления задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Скачивание файла задания
router.get('/:id/download', async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userRole = req.session.userRole || 'student';
    const userId = req.session.userId;
    
    const assignments = await dbOperations.getAssignments();
    const assignment = assignments.find(a => a.id == assignmentId);

    if (!assignment) {
      console.log(`[SECURITY] Assignment not found: ${assignmentId}`);
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }

    // Студенты могут скачивать только опубликованные задания
    if (userRole === 'student' && assignment.is_published !== 1) {
      console.log(`[SECURITY] Unpublished assignment access denied: ${assignmentId} by user ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Задание не опубликовано'
      });
    }

    // ИСПРАВЛЕНО: Защита от directory traversal
    // 1. Нормализуем путь и удаляем попытки выхода из директории
    const safePath = path.normalize(assignment.file_path).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(__dirname, '..', safePath);
    
    // 2. Определяем разрешенную директорию
    const allowedDir = path.join(__dirname, '../uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedAllowedDir = path.resolve(allowedDir);
    
    // 3. Проверяем, что файл находится в разрешенной директории
    if (!resolvedPath.startsWith(resolvedAllowedDir)) {
      console.log(`[SECURITY] Directory traversal attempt blocked: ${assignment.file_path}`);
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // 4. Проверяем существование файла
    if (!fs.existsSync(resolvedPath)) {
      console.log(`[SECURITY] Assignment file not found on disk: ${resolvedPath}`);
      return res.status(404).json({
        success: false,
        message: 'Файл задания не найден на сервере'
      });
    }

    // 5. Безопасное имя для скачивания (без спецсимволов)
    const safeDownloadName = assignment.title.replace(/[^a-zA-Z0-9.-\s]/g, '_') + path.extname(assignment.file_path);
    
    console.log(`[SECURITY] Assignment download authorized: ${assignmentId} by user ${userId} (${userRole})`);
    res.download(resolvedPath, safeDownloadName);

  } catch (error) {
    console.error('Ошибка скачивания файла задания:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статистики заданий
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRole = req.session.userRole || 'student';
    const assignments = await dbOperations.getAssignments();
    
    // Фильтруем задания в зависимости от роли
    let filteredAssignments = assignments;
    if (userRole === 'student') {
      filteredAssignments = assignments.filter(assignment => 
        assignment.is_published === 1
      );
    }
    
    // Подсчет статистики
    const subjectStats = {};
    const statusStats = { published: 0, unpublished: 0 };
    const totalAssignments = filteredAssignments.length;
    
    filteredAssignments.forEach(assignment => {
      // Статистика по предметам
      subjectStats[assignment.subject] = (subjectStats[assignment.subject] || 0) + 1;
      
      // Статистика по статусу публикации
      if (assignment.is_published === 1) {
        statusStats.published++;
      } else {
        statusStats.unpublished++;
      }
    });

    res.json({
      success: true,
      stats: {
        total: totalAssignments,
        bySubject: subjectStats,
        byStatus: statusStats
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики заданий:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');  // ДОБАВЛЕНО: для безопасной генерации имен файлов
const { dbOperations } = require('../database/database');
const config = require('../config');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../uploads/materials');
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

// Получение всех материалов
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { subject, semester, type } = req.query;
    
    const filters = {};
    if (subject) filters.subject = subject;
    if (semester) filters.semester = semester;
    
    const materials = await dbOperations.getMaterials();
    
    // Фильтрация по типу файла
    let filteredMaterials = materials;
    if (type && type !== 'all') {
      filteredMaterials = materials.filter(material => {
        const ext = path.extname(material.file_path).toLowerCase();
        switch (type) {
          case 'lecture':
            return ['.pdf', '.ppt', '.pptx'].includes(ext);
          case 'lab':
            return ['.zip', '.rar'].includes(ext);
          case 'video':
            return ['.mp4', '.avi'].includes(ext);
          default:
            return true;
        }
      });
    }

    res.json({
      success: true,
      materials: filteredMaterials
    });

  } catch (error) {
    console.error('Ошибка получения материалов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение материала по ID
router.get('/:id', async (req, res) => {
  try {
    const materialId = req.params.id;
    
    // Получаем все материалы и фильтруем по ID
    const materials = await dbOperations.getMaterials();
    const material = materials.find(m => m.id == materialId);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Материал не найден'
      });
    }

    res.json({
      success: true,
      material: material
    });

  } catch (error) {
    console.error('Ошибка получения материала:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Загрузка нового материала
router.post('/', upload.single('file'), handleUploadError, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, description, subject, semester, materialType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не загружен'
      });
    }

    const filePath = `/uploads/materials/${req.file.filename}`;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    const materialData = {
      title,
      description,
      file_path: filePath,
      file_type: fileType,
      subject,
      semester: parseInt(semester),
      user_id: userId
    };

    const newMaterial = await dbOperations.createMaterial(materialData);

    res.json({
      success: true,
      message: 'Материал успешно загружен',
      material: newMaterial
    });

  } catch (error) {
    console.error('Ошибка загрузки материала:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Скачивание файла
router.get('/:id/download', async (req, res) => {
  try {
    const materialId = req.params.id;
    
    // Получаем материал через dbOperations (НЕ от пользователя!)
    const materials = await dbOperations.getMaterials();
    const material = materials.find(m => m.id == materialId);

    if (!material) {
      console.log(`[SECURITY] Material not found: ${materialId}`);
      return res.status(404).json({
        success: false,
        message: 'Материал не найден'
      });
    }

    // ИСПРАВЛЕНО: Защита от directory traversal
    // 1. Нормализуем путь и удаляем попытки выхода из директории
    const safePath = path.normalize(material.file_path).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(__dirname, '..', safePath);
    
    // 2. Определяем разрешенную директорию
    const allowedDir = path.join(__dirname, '../uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedAllowedDir = path.resolve(allowedDir);
    
    // 3. Проверяем, что файл находится в разрешенной директории
    if (!resolvedPath.startsWith(resolvedAllowedDir)) {
      console.log(`[SECURITY] Directory traversal attempt blocked: ${material.file_path}`);
      return res.status(403).json({
        success: false,
        message: 'Доступ запрещен'
      });
    }
    
    // 4. Проверяем существование файла
    if (!fs.existsSync(resolvedPath)) {
      console.log(`[SECURITY] File not found on disk: ${resolvedPath}`);
      return res.status(404).json({
        success: false,
        message: 'Файл не найден на сервере'
      });
    }

    // 5. Безопасное имя для скачивания (без спецсимволов)
    const safeDownloadName = material.title.replace(/[^a-zA-Z0-9.-\s]/g, '_') + path.extname(material.file_path);
    
    console.log(`[SECURITY] File download authorized: ${materialId} by user ${req.session?.userId}`);
    res.download(resolvedPath, safeDownloadName);

  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Удаление материала
router.delete('/:id', async (req, res) => {
  try {
    const materialId = req.params.id;
    const userId = req.session.userId;
    
    // Получаем материал через dbOperations
    const materials = await dbOperations.getMaterials();
    const material = materials.find(m => m.id == materialId);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Материал не найден'
      });
    }

    // Проверка прав доступа (пока что простая проверка)
    // В будущем можно добавить проверку teacher_id

    // Удаление файла с диска
    const filePath = path.join(__dirname, '..', material.file_path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Файл успешно удален: ${filePath}`);
      } catch (fileError) {
        console.error('Ошибка удаления файла:', fileError);
        // Продолжаем удаление записи из БД даже если файл не удалился
        // В будущем можно добавить уведомление администратору
      }
    } else {
      console.warn(`Файл не найден на диске: ${filePath}`);
    }

    // Удаление записи из БД через dbOperations
    const result = await dbOperations.deleteMaterial(materialId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Материал успешно удален'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Ошибка удаления материала'
      });
    }

  } catch (error) {
    console.error('Ошибка удаления материала:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статистики материалов
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.session.userId;
    const materials = await dbOperations.getMaterials();
    
    // Подсчет по типам
    const typeStats = {};
    const subjectStats = {};
    const semesterStats = {};
    
    materials.forEach(material => {
      // Статистика по типам файлов
      const ext = path.extname(material.file_path).toLowerCase();
      let type = 'other';
      if (['.pdf', '.ppt', '.pptx'].includes(ext)) type = 'lecture';
      else if (['.zip', '.rar'].includes(ext)) type = 'lab';
      else if (['.mp4', '.avi'].includes(ext)) type = 'video';
      
      typeStats[type] = (typeStats[type] || 0) + 1;
      
      // Статистика по предметам
      subjectStats[material.subject] = (subjectStats[material.subject] || 0) + 1;
      
      // Статистика по семестрам
      semesterStats[material.semester] = (semesterStats[material.semester] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        total: materials.length,
        byType: typeStats,
        bySubject: subjectStats,
        bySemester: semesterStats
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики материалов:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;

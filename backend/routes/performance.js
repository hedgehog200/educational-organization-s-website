const express = require('express');
const { dbOperations } = require('../database/database');

const router = express.Router();

// Получение успеваемости пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const performance = await dbOperations.getPerformance(userId);
    
    res.json({
      success: true,
      performance: performance
    });

  } catch (error) {
    console.error('Ошибка получения успеваемости:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение успеваемости по предметам
router.get('/by-subjects', async (req, res) => {
  try {
    const userId = req.session.userId;
    const performance = await dbOperations.getPerformance(userId);
    
    // Группировка по предметам
    const subjectPerformance = {};
    
    performance.forEach(grade => {
      if (!subjectPerformance[grade.subject]) {
        subjectPerformance[grade.subject] = {
          subject: grade.subject,
          grades: [],
          average: 0,
          total: 0,
          count: 0
        };
      }
      
      subjectPerformance[grade.subject].grades.push({
        id: grade.id,
        grade: grade.grade,
        assignment_type: grade.assignment_type,
        assignment_name: grade.assignment_name,
        semester: grade.semester,
        created_at: grade.created_at
      });
      
      subjectPerformance[grade.subject].total += grade.grade;
      subjectPerformance[grade.subject].count += 1;
    });
    
    // Вычисление средних оценок
    Object.keys(subjectPerformance).forEach(subject => {
      const data = subjectPerformance[subject];
      data.average = Math.round((data.total / data.count) * 10) / 10;
    });

    res.json({
      success: true,
      performance: Object.values(subjectPerformance)
    });

  } catch (error) {
    console.error('Ошибка получения успеваемости по предметам:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение статистики успеваемости
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session.userId;
    const performance = await dbOperations.getPerformance(userId);
    
    if (performance.length === 0) {
      return res.json({
        success: true,
        stats: {
          averageGrade: 0,
          totalGrades: 0,
          excellent: 0,
          good: 0,
          satisfactory: 0,
          unsatisfactory: 0,
          bySemester: {},
          bySubject: {}
        }
      });
    }

    // Общая статистика
    const totalGrades = performance.length;
    const averageGrade = performance.reduce((sum, grade) => sum + grade.grade, 0) / totalGrades;
    
    // Статистика по оценкам
    let excellent = 0, good = 0, satisfactory = 0, unsatisfactory = 0;
    performance.forEach(grade => {
      if (grade.grade >= 4.5) excellent++;
      else if (grade.grade >= 3.5) good++;
      else if (grade.grade >= 3.0) satisfactory++;
      else unsatisfactory++;
    });

    // Статистика по семестрам
    const bySemester = {};
    performance.forEach(grade => {
      if (!bySemester[grade.semester]) {
        bySemester[grade.semester] = { total: 0, count: 0, average: 0 };
      }
      bySemester[grade.semester].total += grade.grade;
      bySemester[grade.semester].count += 1;
    });
    
    Object.keys(bySemester).forEach(semester => {
      bySemester[semester].average = Math.round((bySemester[semester].total / bySemester[semester].count) * 10) / 10;
    });

    // Статистика по предметам
    const bySubject = {};
    performance.forEach(grade => {
      if (!bySubject[grade.subject]) {
        bySubject[grade.subject] = { total: 0, count: 0, average: 0 };
      }
      bySubject[grade.subject].total += grade.grade;
      bySubject[grade.subject].count += 1;
    });
    
    Object.keys(bySubject).forEach(subject => {
      bySubject[subject].average = Math.round((bySubject[subject].total / bySubject[subject].count) * 10) / 10;
    });

    res.json({
      success: true,
      stats: {
        averageGrade: Math.round(averageGrade * 10) / 10,
        totalGrades: totalGrades,
        excellent: excellent,
        good: good,
        satisfactory: satisfactory,
        unsatisfactory: unsatisfactory,
        bySemester: bySemester,
        bySubject: bySubject
      }
    });

  } catch (error) {
    console.error('Ошибка получения статистики успеваемости:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Добавление новой оценки
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { subject, grade, assignment_type, assignment_name, semester } = req.body;
    
    // Валидация
    if (!subject || !grade || !assignment_type || !assignment_name || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Все поля обязательны'
      });
    }

    if (grade < 1 || grade > 5) {
      return res.status(400).json({
        success: false,
        message: 'Оценка должна быть от 1 до 5'
      });
    }

    const gradeData = {
      user_id: userId,
      subject,
      grade: parseFloat(grade),
      assignment_type,
      assignment_name,
      semester: parseInt(semester)
    };

    // Добавляем оценку через dbOperations
    const newGrade = await dbOperations.addGrade({
      student_id: userId,
      subject_id: subject,
      assignment_id: null, // Можно добавить позже
      points: grade,
      max_points: 5,
      grade: grade.toString(),
      semester: parseInt(semester),
      academic_year: new Date().getFullYear().toString()
    });

    res.json({
      success: true,
      message: 'Оценка добавлена успешно',
      grade: newGrade
    });

  } catch (error) {
    console.error('Ошибка добавления оценки:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение графика успеваемости
router.get('/chart', async (req, res) => {
  try {
    const userId = req.session.userId;
    const performance = await dbOperations.getPerformance(userId);
    
    // Группировка по месяцам
    const monthlyData = {};
    performance.forEach(grade => {
      const date = new Date(grade.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0, average: 0 };
      }
      monthlyData[monthKey].total += grade.grade;
      monthlyData[monthKey].count += 1;
    });
    
    // Вычисление средних оценок по месяцам
    const chartData = Object.keys(monthlyData)
      .sort()
      .map(month => {
        const data = monthlyData[month];
        return {
          month: month,
          average: Math.round((data.total / data.count) * 10) / 10
        };
      });

    res.json({
      success: true,
      chartData: chartData
    });

  } catch (error) {
    console.error('Ошибка получения данных для графика:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение посещаемости
router.get('/attendance', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Пока возвращаем статические данные
    // В реальном приложении эти данные должны браться из БД
    const attendanceData = {
      present: 85,
      absent: 8,
      excused: 7,
      totalClasses: 100,
      attendanceRate: 92
    };

    res.json({
      success: true,
      attendance: attendanceData
    });

  } catch (error) {
    console.error('Ошибка получения данных посещаемости:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Получение академических достижений
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Пока возвращаем статические данные
    const achievements = [
      {
        id: 1,
        title: 'Отличник семестра',
        description: 'Получено за высокие оценки в течение 2-го семестра',
        date: '2024-05-01',
        type: 'academic'
      },
      {
        id: 2,
        title: 'Победитель олимпиады по программированию',
        description: 'Внутриколледжная олимпиада по программированию',
        date: '2024-04-15',
        type: 'competition'
      },
      {
        id: 3,
        title: 'Участник научной конференции',
        description: 'Городская научная конференция "Информационные технологии будущего"',
        date: '2024-03-20',
        type: 'conference'
      }
    ];

    res.json({
      success: true,
      achievements: achievements
    });

  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

module.exports = router;

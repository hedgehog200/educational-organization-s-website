// API для работы с успеваемостью
class PerformanceAPI {
  constructor() {
    this.baseURL = '/api/performance';
  }

  // Получение успеваемости
  async getPerformance() {
    try {
      const response = await fetch(this.baseURL);
      const result = await response.json();
      
      if (result.success) {
        return result.performance;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения успеваемости:', error);
      throw error;
    }
  }

  // Получение успеваемости по предметам
  async getPerformanceBySubjects() {
    try {
      const response = await fetch(`${this.baseURL}/by-subjects`);
      const result = await response.json();
      
      if (result.success) {
        return result.performance;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения успеваемости по предметам:', error);
      throw error;
    }
  }

  // Получение статистики
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      const result = await response.json();
      
      if (result.success) {
        return result.stats;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }

  // Получение данных для графика
  async getChartData() {
    try {
      const response = await fetch(`${this.baseURL}/chart`);
      const result = await response.json();
      
      if (result.success) {
        return result.chartData;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения данных графика:', error);
      throw error;
    }
  }

  // Получение посещаемости
  async getAttendance() {
    try {
      const response = await fetch(`${this.baseURL}/attendance`);
      const result = await response.json();
      
      if (result.success) {
        return result.attendance;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения посещаемости:', error);
      throw error;
    }
  }

  // Получение достижений
  async getAchievements() {
    try {
      const response = await fetch(`${this.baseURL}/achievements`);
      const result = await response.json();
      
      if (result.success) {
        return result.achievements;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения достижений:', error);
      throw error;
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  const performanceAPI = new PerformanceAPI();
  
  // Загрузка данных при загрузке страницы
  loadPerformanceData();
  
  // Функция загрузки всех данных успеваемости
  async function loadPerformanceData() {
    try {
      // Загружаем данные параллельно
      const [performance, stats, attendance, achievements] = await Promise.all([
        performanceAPI.getPerformanceBySubjects(),
        performanceAPI.getStats(),
        performanceAPI.getAttendance(),
        performanceAPI.getAchievements()
      ]);
      
      // Обновляем интерфейс
      updatePerformanceTable(performance);
      updateStatsCards(stats);
      updateAttendanceChart(attendance);
      updateAchievements(achievements);
      
    } catch (error) {
      console.error('Ошибка загрузки данных успеваемости:', error);
      showMessage('Ошибка загрузки данных', 'error');
    }
  }
  
  // Обновление таблицы успеваемости
  function updatePerformanceTable(performance) {
    const tbody = document.querySelector('.grades-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    performance.forEach(subjectData => {
      const row = createSubjectRow(subjectData);
      tbody.appendChild(row);
    });
  }
  
  // Создание строки предмета
  function createSubjectRow(subjectData) {
    const row = document.createElement('tr');
    row.className = 'subject-row';
    
    const averageGrade = subjectData.average;
    const gradeClass = getGradeClass(averageGrade);
    const statusBadge = getStatusBadge(averageGrade);
    
    row.innerHTML = `
      <td>${subjectData.subject}</td>
      <td>Преподаватель</td>
      <td class="grade ${gradeClass}">${averageGrade}</td>
      <td>95%</td>
      <td><span class="status-badge ${gradeClass}">${statusBadge}</span></td>
      <td><button class="details-btn" onclick="toggleDetails(${subjectData.subject.replace(/\s+/g, '')})"><i class="fas fa-chevron-down"></i></button></td>
    `;
    
    // Добавляем строку с деталями
    const detailsRow = createDetailsRow(subjectData);
    tbody.appendChild(row);
    tbody.appendChild(detailsRow);
    
    return row;
  }
  
  // Создание строки с деталями
  function createDetailsRow(subjectData) {
    const row = document.createElement('tr');
    row.className = 'details-row';
    row.id = `details-${subjectData.subject.replace(/\s+/g, '')}`;
    row.style.display = 'none';
    
    const assignmentsList = subjectData.grades.map(grade => `
      <li>
        <span class="assignment-name">${grade.assignment_name}</span>
        <span class="assignment-grade ${getGradeClass(grade.grade)}">${grade.grade}</span>
      </li>
    `).join('');
    
    row.innerHTML = `
      <td colspan="6">
        <div class="subject-details">
          <div class="assignments-list">
            <h4>Задания:</h4>
            <ul>${assignmentsList}</ul>
          </div>
          <div class="teacher-comments">
            <h4>Комментарии преподавателя:</h4>
            <p>Хорошие результаты по предмету. Продолжайте в том же духе!</p>
          </div>
        </div>
      </td>
    `;
    
    return row;
  }
  
  // Обновление карточек статистики
  function updateStatsCards(stats) {
    // Обновляем средний балл
    const averageElement = document.querySelector('.stat-card p');
    if (averageElement) {
      averageElement.textContent = stats.averageGrade;
    }
    
    // Обновляем выполненные задания
    const completedElement = document.querySelector('.stat-card:nth-child(2) p');
    if (completedElement) {
      completedElement.textContent = `${stats.completedAssignments || 0}/${stats.totalAssignments || 0}`;
    }
    
    // Обновляем посещаемость
    const attendanceElement = document.querySelector('.stat-card:nth-child(3) p');
    if (attendanceElement) {
      attendanceElement.textContent = `${stats.attendance || 92}%`;
    }
  }
  
  // Обновление графика посещаемости
  function updateAttendanceChart(attendance) {
    // Обновляем статистику посещаемости
    const presentElement = document.querySelector('.stat-circle.present span');
    const absentElement = document.querySelector('.stat-circle.absent span');
    const excusedElement = document.querySelector('.stat-circle.excused span');
    
    if (presentElement) presentElement.textContent = `${attendance.present}%`;
    if (absentElement) absentElement.textContent = `${attendance.absent}%`;
    if (excusedElement) excusedElement.textContent = `${attendance.excused}%`;
  }
  
  // Обновление достижений
  function updateAchievements(achievements) {
    const container = document.querySelector('.achievements-container');
    if (!container) return;
    
    container.innerHTML = achievements.map(achievement => `
      <div class="achievement-card">
        <div class="achievement-icon">
          <i class="fas fa-${getAchievementIcon(achievement.type)}"></i>
        </div>
        <div class="achievement-info">
          <h3>${achievement.title}</h3>
          <p>${achievement.description}</p>
          <span class="achievement-date">${formatDate(achievement.date)}</span>
        </div>
      </div>
    `).join('');
  }
  
  // Глобальные функции
  window.toggleDetails = function(subjectId) {
    const detailsRow = document.getElementById(`details-${subjectId}`);
    const button = document.querySelector(`[onclick="toggleDetails(${subjectId})"] i`);
    
    if (detailsRow.style.display === 'none') {
      detailsRow.style.display = 'table-row';
      button.classList.remove('fa-chevron-down');
      button.classList.add('fa-chevron-up');
    } else {
      detailsRow.style.display = 'none';
      button.classList.remove('fa-chevron-up');
      button.classList.add('fa-chevron-down');
    }
  };
  
  // Вспомогательные функции
  function getGradeClass(grade) {
    if (grade >= 4.5) return 'excellent';
    if (grade >= 3.5) return 'good';
    if (grade >= 3.0) return 'satisfactory';
    return 'unsatisfactory';
  }
  
  function getStatusBadge(grade) {
    if (grade >= 4.5) return 'Отлично';
    if (grade >= 3.5) return 'Хорошо';
    if (grade >= 3.0) return 'Удовлетворительно';
    return 'Неудовлетворительно';
  }
  
  function getAchievementIcon(type) {
    const iconMap = {
      'academic': 'medal',
      'competition': 'trophy',
      'conference': 'certificate'
    };
    return iconMap[type] || 'star';
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'long' 
    });
  }
  
  function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      padding: 10px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      max-width: 300px;
    `;
    
    messageDiv.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
});

// API для работы с учебными материалами
class MaterialsAPI {
  constructor() {
    this.baseURL = '/api/materials';
  }

  // Получение всех материалов
  async getMaterials(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`${this.baseURL}?${params}`);
      const result = await response.json();
      
      if (result.success) {
        return result.materials;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка получения материалов:', error);
      throw error;
    }
  }

  // Загрузка нового материала
  async uploadMaterial(formData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.material;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка загрузки материала:', error);
      throw error;
    }
  }

  // Скачивание файла
  async downloadMaterial(materialId) {
    try {
      const response = await fetch(`${this.baseURL}/${materialId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'material';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Ошибка скачивания файла');
      }
    } catch (error) {
      console.error('Ошибка скачивания материала:', error);
      throw error;
    }
  }

  // Удаление материала
  async deleteMaterial(materialId) {
    try {
      const response = await fetch(`${this.baseURL}/${materialId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Ошибка удаления материала:', error);
      throw error;
    }
  }

  // Получение статистики материалов
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats/overview`);
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
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  const materialsAPI = new MaterialsAPI();
  
  // Загрузка материалов при загрузке страницы
  loadMaterials();
  
  // Обработчики фильтров
  const subjectFilter = document.getElementById('subjectFilter');
  const semesterFilter = document.getElementById('semesterFilter');
  const typeFilter = document.getElementById('typeFilter');
  
  if (subjectFilter) {
    subjectFilter.addEventListener('change', loadMaterials);
  }
  if (semesterFilter) {
    semesterFilter.addEventListener('change', loadMaterials);
  }
  if (typeFilter) {
    typeFilter.addEventListener('change', loadMaterials);
  }
  
  // Обработчик загрузки файла
  const uploadForm = document.getElementById('uploadMaterialForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUpload);
  }
  
  // Функция загрузки материалов
  async function loadMaterials() {
    try {
      const filters = {
        subject: subjectFilter ? subjectFilter.value : 'all',
        semester: semesterFilter ? semesterFilter.value : 'all',
        type: typeFilter ? typeFilter.value : 'all'
      };
      
      const materials = await materialsAPI.getMaterials(filters);
      displayMaterials(materials);
    } catch (error) {
      console.error('Ошибка загрузки материалов:', error);
      showMessage('Ошибка загрузки материалов', 'error');
    }
  }
  
  // Функция отображения материалов
  function displayMaterials(materials) {
    const materialsContainer = document.querySelector('.materials-grid');
    if (!materialsContainer) return;
    
    // Группировка по предметам
    const groupedMaterials = {};
    materials.forEach(material => {
      if (!groupedMaterials[material.subject]) {
        groupedMaterials[material.subject] = [];
      }
      groupedMaterials[material.subject].push(material);
    });
    
    // Очистка контейнера
    materialsContainer.innerHTML = '';
    
    // Отображение материалов по группам
    Object.keys(groupedMaterials).forEach(subject => {
      const subjectGroup = createSubjectGroup(subject, groupedMaterials[subject]);
      materialsContainer.appendChild(subjectGroup);
    });
  }
  
  // Создание группы материалов по предмету
  function createSubjectGroup(subject, materials) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'material-category';
    
    const iconMap = {
      'Программирование': 'fas fa-laptop-code',
      'Базы данных': 'fas fa-database',
      'Информационная безопасность': 'fas fa-shield-alt',
      'Математика': 'fas fa-calculator',
      'Компьютерные сети': 'fas fa-network-wired'
    };
    
    groupDiv.innerHTML = `
      <h3><i class="${iconMap[subject] || 'fas fa-book'}"></i> ${subject}</h3>
      <div class="materials-grid">
        ${materials.map(material => createMaterialCard(material)).join('')}
      </div>
    `;
    
    return groupDiv;
  }
  
  // Создание карточки материала
  function createMaterialCard(material) {
    const fileIcon = getFileIcon(material.file_type);
    const fileSize = '2.5 MB'; // В реальном приложении размер должен браться из БД
    
    return `
      <div class="material-card">
        <div class="material-icon"><i class="${fileIcon}"></i></div>
        <div class="material-info">
          <h4>${material.title}</h4>
          <p class="material-details">
            <span class="material-type">${getFileTypeName(material.file_type)}</span>
            <span class="material-date">Добавлено: ${formatDate(material.created_at)}</span>
            <span class="material-size">${fileSize}</span>
          </p>
          <div class="material-description">
            ${material.description || 'Описание отсутствует'}
          </div>
        </div>
        <div class="material-actions">
          <button class="view-btn" onclick="viewMaterial(${material.id})"><i class="fas fa-eye"></i></button>
          <button class="download-btn" onclick="downloadMaterial(${material.id})"><i class="fas fa-download"></i></button>
          <button class="favorite-btn"><i class="far fa-star"></i></button>
        </div>
      </div>
    `;
  }
  
  // Обработчик загрузки файла
  async function handleUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const title = document.getElementById('materialTitle').value;
    const subject = document.getElementById('materialSubject').value;
    const type = document.getElementById('materialType').value;
    const semester = document.getElementById('materialSemester').value;
    const description = document.getElementById('materialDescription').value;
    const file = document.getElementById('materialFile').files[0];
    
    if (!file) {
      showMessage('Выберите файл для загрузки', 'error');
      return;
    }
    
    formData.append('title', title);
    formData.append('description', description);
    formData.append('subject', subject);
    formData.append('semester', semester);
    formData.append('materialType', type);
    formData.append('file', file);
    
    try {
      showMessage('Загрузка файла...', 'info');
      
      await materialsAPI.uploadMaterial(formData);
      
      showMessage('Материал успешно загружен!', 'success');
      
      // Закрываем модальное окно
      const modal = document.getElementById('uploadModal');
      if (modal) {
        modal.style.display = 'none';
      }
      
      // Очищаем форму
      document.getElementById('uploadMaterialForm').reset();
      
      // Перезагружаем материалы
      loadMaterials();
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showMessage('Ошибка загрузки файла', 'error');
    }
  }
  
  // Глобальные функции для кнопок
  window.viewMaterial = function(materialId) {
    console.log('Просмотр материала:', materialId);
    // Здесь можно добавить логику просмотра
  };
  
  window.downloadMaterial = async function(materialId) {
    try {
      await materialsAPI.downloadMaterial(materialId);
    } catch (error) {
      showMessage('Ошибка скачивания файла', 'error');
    }
  };
  
  // Вспомогательные функции
  function getFileIcon(fileType) {
    const iconMap = {
      '.pdf': 'fas fa-file-pdf',
      '.doc': 'fas fa-file-word',
      '.docx': 'fas fa-file-word',
      '.ppt': 'fas fa-file-powerpoint',
      '.pptx': 'fas fa-file-powerpoint',
      '.zip': 'fas fa-file-archive',
      '.rar': 'fas fa-file-archive',
      '.mp4': 'fas fa-file-video',
      '.avi': 'fas fa-file-video'
    };
    return iconMap[fileType] || 'fas fa-file';
  }
  
  function getFileTypeName(fileType) {
    const typeMap = {
      '.pdf': 'PDF',
      '.doc': 'Word',
      '.docx': 'Word',
      '.ppt': 'PowerPoint',
      '.pptx': 'PowerPoint',
      '.zip': 'Архив',
      '.rar': 'Архив',
      '.mp4': 'Видео',
      '.avi': 'Видео'
    };
    return typeMap[fileType] || 'Файл';
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  }
  
  function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
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
    
    if (type === 'error') {
      messageDiv.style.backgroundColor = '#dc3545';
    } else if (type === 'success') {
      messageDiv.style.backgroundColor = '#28a745';
    } else {
      messageDiv.style.backgroundColor = '#17a2b8';
    }
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
});

// Общие утилиты для всех страниц
// Функции для работы с модальными окнами
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // ИСПРАВЛЕНО: Используем класс 'show' вместо 'active' для совместимости с CSS
        modal.classList.add('show');
        modal.style.display = 'flex'; // Явно устанавливаем display
        document.body.style.overflow = 'hidden';
        
        // Force remove any backdrop elements
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Remove any dark overlays
        const overlays = document.querySelectorAll('[class*="backdrop"], [class*="overlay"]');
        overlays.forEach(overlay => overlay.remove());
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // ИСПРАВЛЕНО: Используем класс 'show' вместо 'active'
        modal.classList.remove('show');
        modal.style.display = 'none'; // Явно скрываем
        document.body.style.overflow = 'auto';
        
        // Очищаем форму пользователя при закрытии модального окна
        if (modalId === 'addUserModal') {
            const form = document.getElementById('addUserForm');
            if (form) {
                form.reset();
            }
        }
    }
}

// Функция для показа/скрытия загрузки
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        if (show) {
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    // Используем глобальную систему уведомлений если она доступна
    if (window.notificationSystem) {
        const title = type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Информация';
        window.notificationSystem.addNotification(title, message, type);
        return;
    }
    
    // Fallback: Создаем контейнер для уведомлений, если его нет
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(notificationContainer);
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;

    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    if (!document.querySelector('#notificationStyles')) {
        style.id = 'notificationStyles';
        document.head.appendChild(style);
    }

    notificationContainer.appendChild(notification);

    // Автоматически удаляем уведомление через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Функция для форматирования даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Функция для форматирования времени
function formatTime(timeString) {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Функция для валидации email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Функция для валидации телефона
function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/\s/g, ''));
}

// ============================================
// CSRF Protection Support (ОБНОВЛЕНО для безопасности)
// ============================================

/**
 * Получить CSRF токен с сервера
 */
async function getCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        return data.csrfToken;
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        return null;
    }
}

/**
 * Универсальная функция для API запросов с CSRF (ОБНОВЛЕНО)
 */
async function apiRequest(url, options = {}) {
    try {
        // Для POST/PUT/DELETE добавляем CSRF токен
        if (options.method && options.method !== 'GET') {
            const csrfToken = await getCsrfToken();
            
            if (!options.headers) {
                options.headers = {};
            }
            
            if (csrfToken) {
                options.headers['X-CSRF-Token'] = csrfToken;
            }
        }
        
        // Всегда отправляем credentials
        options.credentials = 'include';
        
        // Если есть Content-Type, сохраняем его
        if (options.headers && !options.headers['Content-Type'] && !options.body instanceof FormData) {
            options.headers['Content-Type'] = 'application/json';
        }
        
        // Выполняем запрос
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Если ответ JSON, парсим
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return response;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Старая функция для обратной совместимости (DEPRECATED)
function getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : '';
}

// Старая функция для обратной совместимости (DEPRECATED)
async function makeRequest(url, options = {}) {
    return apiRequest(url, options);
}

// Экспортируем функции глобально
window.getCsrfToken = getCsrfToken;
window.apiRequest = apiRequest;

// Функция для обработки ошибок
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    showNotification(`Ошибка: ${error.message}`, 'error');
}

// Функция для дебаунса
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функция для троттлинга
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

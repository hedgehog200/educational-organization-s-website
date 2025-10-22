// Скрипт для переключения между формами входа и регистрации
document.addEventListener('DOMContentLoaded', function() {
  // Проверка статуса сервера при загрузке
  checkServerStatus();
  const tabButtons = document.querySelectorAll('.tab-btn');
  const authForms = document.querySelectorAll('.auth-form');
  
  // Переключение между вкладками
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // Убираем активный класс со всех кнопок
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Добавляем активный класс к нажатой кнопке
      this.classList.add('active');
      
      // Скрываем все формы
      authForms.forEach(form => form.classList.remove('active'));
      // Показываем нужную форму
      document.getElementById(targetTab + 'Form').classList.add('active');
    });
  });
  
  // Валидация формы регистрации
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const password = this.querySelector('input[name="password"]').value;
      const confirmPassword = this.querySelector('input[name="confirm_password"]').value;
      
      if (password !== confirmPassword) {
        showMessage('Пароли не совпадают!', 'error');
        return;
      }
      
      if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов!', 'error');
        return;
      }
      
      const userData = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        password: password,
        specialty: formData.get('specialty')
      };
      
      try {
        showMessage('Регистрация...', 'info');
        
        const result = await apiRequest('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData)
        });
        
        if (result.success) {
          showMessage('Регистрация успешно завершена!', 'success');
          // Переключаем на форму входа
          document.querySelector('[data-tab="login"]').click();
          // Очищаем форму
          this.reset();
        } else {
          showMessage(result.message || 'Ошибка регистрации', 'error');
        }
      } catch (error) {
        console.error('Ошибка регистрации:', error);
        if (error.message && error.message.includes('HTTP error')) {
          showMessage('Ошибка регистрации. Проверьте введенные данные', 'error');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showMessage('Сервер недоступен. Убедитесь, что бэкенд запущен на порту 3000', 'error');
        } else {
          showMessage(error.message || 'Ошибка соединения с сервером', 'error');
        }
      }
    });
  }
  
  // Валидация формы входа
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = this.querySelector('input[name="email"]').value;
      const password = this.querySelector('input[name="password"]').value;
      
      if (!email || !password) {
        showMessage('Пожалуйста, заполните все поля!', 'error');
        return;
      }
      
      try {
        showMessage('Вход...', 'info');
        
        const result = await apiRequest('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password })
        });
        
        if (result.success) {
          showMessage('Вход выполнен успешно!', 'success');
          
          // Сохраняем токен в localStorage
          if (result.token) {
            localStorage.setItem('token', result.token);
          }
          
          // Сохраняем информацию о пользователе
          if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('userData', JSON.stringify(result.user));
            localStorage.setItem('userRole', result.user.role);
            localStorage.setItem('userId', result.user.id);
          }
          
               // Переходим в соответствующий кабинет в зависимости от роли
               setTimeout(() => {
                 if (result.user && result.user.role === 'admin') {
                   window.location.href = 'admin.html';
                 } else if (result.user && result.user.role === 'teacher') {
                   window.location.href = 'teacher.html';
                 } else {
                   window.location.href = 'lk.html';
                 }
               }, 1000);
        } else {
          showMessage(result.message || 'Ошибка входа', 'error');
        }
      } catch (error) {
        console.error('Ошибка входа:', error);
        if (error.message && error.message.includes('HTTP error')) {
          showMessage('Неверный email или пароль', 'error');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          showMessage('Сервер недоступен. Убедитесь, что бэкенд запущен на порту 3000', 'error');
        } else {
          showMessage(error.message || 'Ошибка соединения с сервером', 'error');
        }
      }
    });
  }
  
  // Функция для показа сообщений
  function showMessage(message, type) {
    // Удаляем предыдущие сообщения
    const existingMessage = document.querySelector('.auth-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
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
      word-wrap: break-word;
    `;
    
    if (type === 'error') {
      messageDiv.style.backgroundColor = '#dc3545';
    } else if (type === 'success') {
      messageDiv.style.backgroundColor = '#28a745';
    } else {
      messageDiv.style.backgroundColor = '#17a2b8';
    }
    
    document.body.appendChild(messageDiv);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
  
  // Функция проверки статуса сервера
  async function checkServerStatus() {
    try {
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
      }
    } catch (error) {
      console.error('Server is not running or not accessible:', error);
      showMessage('Сервер недоступен. Убедитесь, что бэкенд запущен на порту 3000', 'error');
    }
  }
});

// Общая проверка аутентификации для всех страниц
class AuthChecker {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthentication();
    }

    // Проверка аутентификации
    async checkAuthentication() {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userData');
        
        if (!token) {
            this.redirectToLogin();
            return;
        }
        
        try {
            // Проверяем данные пользователя
            if (userData) {
                const user = JSON.parse(userData);
                
                // Обновляем имя пользователя в интерфейсе
                this.updateUserName(user.full_name || 'Пользователь');
                
                return user;
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.redirectToLogin();
        }
    }

    // Обновление имени пользователя в интерфейсе
    updateUserName(name) {
        const nameElements = document.querySelectorAll('.user-name, #userName, .admin-name, #adminName');
        nameElements.forEach(element => {
            element.textContent = name;
        });
    }

    // Перенаправление на страницу входа
    redirectToLogin() {
        window.location.href = '/';
    }

    // Проверка роли пользователя
    checkUserRole(requiredRole) {
        const userData = localStorage.getItem('userData');
        if (!userData) return false;
        
        try {
            const user = JSON.parse(userData);
            return user.role === requiredRole;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return false;
        }
    }

    // Получение данных пользователя
    getUserData() {
        const userData = localStorage.getItem('userData');
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    // Проверка, является ли пользователь администратором
    isAdmin() {
        return this.checkUserRole('admin');
    }

    // Проверка, является ли пользователь преподавателем
    isTeacher() {
        return this.checkUserRole('teacher');
    }

    // Проверка, является ли пользователь студентом
    isStudent() {
        return this.checkUserRole('student');
    }

    // Перенаправление в зависимости от роли
    redirectByRole() {
        const user = this.getUserData();
        if (!user) {
            this.redirectToLogin();
            return;
        }

        switch (user.role) {
            case 'admin':
                window.location.href = '/admin.html';
                break;
            case 'teacher':
                window.location.href = '/teacher.html';
                break;
            case 'student':
                window.location.href = '/lk.html';
                break;
            default:
                this.redirectToLogin();
        }
    }

    // Выход из системы
    logout() {
        try {
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            localStorage.removeItem('user');
            
            // Show logout notification
            if (window.notificationSystem) {
                window.notificationSystem.success('Выход выполнен', 'Вы успешно вышли из системы');
            }
            
            // Redirect to main page after a short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
            
        } catch (error) {
            console.error('Error during logout:', error);
            // Even if there's an error, try to redirect
            window.location.href = '/';
        }
    }
}

// Создаем глобальный экземпляр
window.authChecker = new AuthChecker();

// Глобальные функции для совместимости
function checkAuthentication() {
    return window.authChecker.checkAuthentication();
}

function logout() {
    return window.authChecker.logout();
}

function isAdmin() {
    return window.authChecker.isAdmin();
}

function isTeacher() {
    return window.authChecker.isTeacher();
}

function isStudent() {
    return window.authChecker.isStudent();
}

function getUserData() {
    return window.authChecker.getUserData();
}

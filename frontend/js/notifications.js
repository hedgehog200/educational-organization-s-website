// Система уведомлений
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.init();
    }

    init() {
        // Создаем контейнер для уведомлений
        this.createNotificationContainer();
        this.setupBellIcon();
    }

    createNotificationContainer() {
        // Удаляем существующий контейнер если есть
        const existing = document.getElementById('notificationContainer');
        if (existing) {
            existing.remove();
        }

        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    setupBellIcon() {
        // Находим колокольчик и добавляем функционал
        const bellIcon = document.querySelector('.notification-bell');
        if (bellIcon) {
            bellIcon.addEventListener('click', () => {
                this.toggleNotificationPanel();
            });
        }
    }

    addNotification(title, message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now() + Math.random(),
            title,
            message,
            type,
            timestamp: new Date(),
            read: false
        };

        this.notifications.unshift(notification);
        
        // Ограничиваем количество уведомлений
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.showNotification(notification);
        this.updateBellBadge();
        this.saveToStorage();
    }

    showNotification(notification) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notificationElement = document.createElement('div');
        notificationElement.className = `notification-item ${notification.type}`;
        notificationElement.dataset.id = notification.id;

        const icon = this.getNotificationIcon(notification.type);
        const timeAgo = this.getTimeAgo(notification.timestamp);

        notificationElement.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <button class="notification-close" onclick="notificationSystem.removeNotification(${notification.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(notificationElement);

        // Анимация появления
        setTimeout(() => {
            notificationElement.classList.add('show');
        }, 100);

        // Автоматическое удаление
        if (notification.type !== 'error') {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, 5000);
        }
    }

    removeNotification(id) {
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.classList.add('hide');
            setTimeout(() => {
                element.remove();
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateBellBadge();
        this.saveToStorage();
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('show');
            if (panel.classList.contains('show')) {
                this.renderPanelNotifications();
                this.markAllAsRead();
            }
        }
    }

    renderPanelNotifications() {
        const panelBody = document.getElementById('notificationPanelBody');
        if (!panelBody) return;

        if (this.notifications.length === 0) {
            panelBody.innerHTML = '<div class="no-notifications">Нет уведомлений</div>';
            return;
        }

        panelBody.innerHTML = this.notifications.map(notification => {
            const icon = this.getNotificationIcon(notification.type);
            const timeAgo = this.getTimeAgo(notification.timestamp);
            return `
                <div class="notification-panel-item ${notification.read ? 'read' : 'unread'}">
                    <div class="notification-panel-icon ${notification.type}">${icon}</div>
                    <div class="notification-panel-content">
                        <div class="notification-panel-title">${notification.title}</div>
                        <div class="notification-panel-message">${notification.message}</div>
                        <div class="notification-panel-time">${timeAgo}</div>
                    </div>
                    <button class="notification-panel-remove" onclick="notificationSystem.removeNotification(${notification.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.updateBellBadge();
        this.saveToStorage();
    }

    updateBellBadge() {
        const badge = document.querySelector('.notification-badge');
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (hours < 24) return `${hours} ч назад`;
        return `${days} дн назад`;
    }

    clearAllNotifications() {
        this.notifications = [];
        this.updateBellBadge();
        this.saveToStorage();
        
        // Очищаем контейнер уведомлений
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.innerHTML = '';
        }
        
        // Очищаем панель уведомлений
        const panelBody = document.getElementById('notificationPanelBody');
        if (panelBody) {
            panelBody.innerHTML = '<div class="no-notifications">Нет уведомлений</div>';
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('Ошибка сохранения уведомлений:', error);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
                this.updateBellBadge();
            }
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    }

    // Методы для разных типов уведомлений
    success(title, message) {
        this.addNotification(title, message, 'success');
    }

    error(title, message) {
        this.addNotification(title, message, 'error', 0); // Не исчезает автоматически
    }

    warning(title, message) {
        this.addNotification(title, message, 'warning');
    }

    info(title, message) {
        this.addNotification(title, message, 'info');
    }
}

// Создаем глобальный экземпляр
window.notificationSystem = new NotificationSystem();

// Загружаем уведомления при инициализации
document.addEventListener('DOMContentLoaded', () => {
    notificationSystem.loadFromStorage();
});

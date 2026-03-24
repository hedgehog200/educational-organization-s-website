// =============================================
// УНИВЕРСАЛЬНЫЙ МЕНЕДЖЕР МОДАЛЬНЫХ ОКОН
// Единая система для всех модальных окон
// =============================================

class ModalManager {
    constructor() {
        this.activeModals = [];
        this.init();
    }

    init() {
        // Закрытие модальных окон по клику на overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.close(e.target.id);
            }
        });

        // Закрытие модальных окон по нажатию ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                const lastModal = this.activeModals[this.activeModals.length - 1];
                this.close(lastModal);
            }
        });

        // Обработка всех кнопок закрытия
        document.querySelectorAll('.close-btn, .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                }
            });
        });
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with id "${modalId}" not found`);
            return;
        }

        // Добавляем в список активных модалов
        if (!this.activeModals.includes(modalId)) {
            this.activeModals.push(modalId);
        }

        // Показываем модальное окно
        modal.style.display = 'flex';
        
        // Блокируем скролл body
        if (this.activeModals.length === 1) {
            document.body.style.overflow = 'hidden';
        }

        // Добавляем класс show для анимации
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Фокусируемся на первом input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with id "${modalId}" not found`);
            return;
        }

        // Убираем класс show
        modal.classList.remove('show');

        // Скрываем модальное окно после анимации
        setTimeout(() => {
            modal.style.display = 'none';
            
            // Удаляем из списка активных модалов
            this.activeModals = this.activeModals.filter(id => id !== modalId);
            
            // Разблокируем скролл body если нет других модалов
            if (this.activeModals.length === 0) {
                document.body.style.overflow = '';
            }

            // Очищаем форму если есть
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }, 300);
    }

    closeAll() {
        this.activeModals.forEach(modalId => {
            this.close(modalId);
        });
    }

    showLoading(modalId, show = true) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        let loadingOverlay = modal.querySelector('.loading-overlay');
        
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p style="margin-top: 16px; color: var(--text-color); font-weight: 500;">Загрузка...</p>
                </div>
            `;
            modal.querySelector('.modal-content').appendChild(loadingOverlay);
        }

        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }

    confirm(title, message, onConfirm, onCancel) {
        // Создаем модальное окно подтверждения
        const confirmModal = document.createElement('div');
        confirmModal.id = 'confirmModal';
        confirmModal.className = 'modal';
        confirmModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-question-circle"></i> ${title}</h3>
                    <button class="close-btn" onclick="modalManager.close('confirmModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="font-size: var(--font-base); color: var(--text-color); margin: 0;">
                        ${message}
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="modalManager.handleConfirmCancel()">
                        <i class="fas fa-times"></i> Отмена
                    </button>
                    <button class="modal-btn modal-btn-primary" onclick="modalManager.handleConfirmOk()">
                        <i class="fas fa-check"></i> Подтвердить
                    </button>
                </div>
            </div>
        `;

        // Добавляем в DOM
        document.body.appendChild(confirmModal);

        // Сохраняем колбэки
        this._confirmCallback = onConfirm;
        this._cancelCallback = onCancel;

        // Открываем модальное окно
        this.open('confirmModal');
    }

    handleConfirmOk() {
        if (this._confirmCallback) {
            this._confirmCallback();
        }
        this.close('confirmModal');
        setTimeout(() => {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.remove();
            }
        }, 500);
    }

    handleConfirmCancel() {
        if (this._cancelCallback) {
            this._cancelCallback();
        }
        this.close('confirmModal');
        setTimeout(() => {
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) {
                confirmModal.remove();
            }
        }, 500);
    }

    alert(title, message, type = 'info') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#4a6baf'
        };

        // Создаем модальное окно оповещения
        const alertModal = document.createElement('div');
        alertModal.id = 'alertModal';
        alertModal.className = 'modal';
        alertModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, ${colors[type]}, ${colors[type]}dd);">
                    <h3><i class="fas ${icons[type]}"></i> ${title}</h3>
                    <button class="close-btn" onclick="modalManager.close('alertModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="font-size: var(--font-base); color: var(--text-color); margin: 0;">
                        ${message}
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" onclick="modalManager.closeAlert()">
                        <i class="fas fa-check"></i> ОК
                    </button>
                </div>
            </div>
        `;

        // Добавляем в DOM
        document.body.appendChild(alertModal);

        // Открываем модальное окно
        this.open('alertModal');
    }

    closeAlert() {
        this.close('alertModal');
        setTimeout(() => {
            const alertModal = document.getElementById('alertModal');
            if (alertModal) {
                alertModal.remove();
            }
        }, 500);
    }
}

// Создаем глобальный экземпляр
window.modalManager = new ModalManager();

// Глобальные функции для обратной совместимости
window.showModal = function(modalId) {
    window.modalManager.open(modalId);
};

window.closeModal = function(modalId) {
    window.modalManager.close(modalId);
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Modal Manager initialized
});


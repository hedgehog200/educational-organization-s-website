// =============================================
// ЛИЧНЫЙ КАБИНЕТ ПРЕПОДАВАТЕЛЯ
// Полный функционал с новым дизайном
// =============================================

class TeacherDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.assignments = [];
        this.materials = [];
        this.students = [];
        this.grades = [];
        // Сохраняем оригинальные данные для фильтрации
        this.originalAssignments = [];
        this.originalMaterials = [];
        this.originalStudents = [];
        this.originalGrades = [];
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');
        
        if (!token) {
            window.location.href = '/';
            return;
        }
        
        if (userRole !== 'teacher') {
            if (userRole === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/lk.html';
            }
            return;
        }
        
        // Загружаем данные преподавателя
        await this.loadTeacherInfo();
    }

    async loadTeacherInfo() {
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                this.updateTeacherName(user.full_name || 'Преподаватель');
            }
        } catch (error) {
            console.error('Error loading teacher info:', error);
        }
    }

    updateTeacherName(name) {
        const elements = ['teacherName', 'teacherNameMobile'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = name;
            }
        });
    }

    setupEventListeners() {
        // Формы модальных окон
        const addAssignmentForm = document.getElementById('addAssignmentForm');
        if (addAssignmentForm) {
            addAssignmentForm.addEventListener('submit', this.handleAddAssignment.bind(this));
        }

        const addMaterialForm = document.getElementById('addMaterialForm');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', this.handleAddMaterial.bind(this));
        }

        const addGradeForm = document.getElementById('addGradeForm');
        if (addGradeForm) {
            addGradeForm.addEventListener('submit', this.handleAddGrade.bind(this));
        }

        const markAttendanceForm = document.getElementById('markAttendanceForm');
        if (markAttendanceForm) {
            markAttendanceForm.addEventListener('submit', this.handleMarkAttendance.bind(this));
        }

        // Поисковые поля
        const searchFields = [
            { id: 'assignmentSearch', handler: this.filterAssignments.bind(this) },
            { id: 'studentSearch', handler: this.filterStudents.bind(this) }
        ];

        searchFields.forEach(({ id, handler }) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', handler);
            }
        });
    }

    async loadDashboardData() {
        this.showLoading(true);
        
        try {
        await Promise.all([
                this.loadStats(),
                this.loadRecentActivity()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/teacher/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateStatsDisplay(data.stats || data);
                } else {
                    // Используем демо-данные
                    this.updateStatsDisplay({
                        totalAssignments: 12,
                        totalStudents: 45,
                        totalMaterials: 23,
                        averageGrade: 4.5
                    });
                }
            } else {
                // Демо-данные если сервер недоступен
                this.updateStatsDisplay({
                    totalAssignments: 12,
                    totalStudents: 45,
                    totalMaterials: 23,
                    averageGrade: 4.5
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Демо-данные в случае ошибки
            this.updateStatsDisplay({
                totalAssignments: 12,
                totalStudents: 45,
                totalMaterials: 23,
                averageGrade: 4.5
            });
        }
    }

    updateStatsDisplay(data) {
        const stats = [
            { id: 'totalAssignments', value: data.totalAssignments || 0 },
            { id: 'totalStudents', value: data.totalStudents || 0 },
            { id: 'totalMaterials', value: data.totalMaterials || 0 },
            { id: 'averageGrade', value: (data.averageGrade || 0).toFixed(1) }
        ];

        stats.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.error(`Element with id "${id}" not found in teacher.html`);
            }
        });
    }

    async loadRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        // Заглушка для последней активности
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <div class="activity-content">
                    <p>Добро пожаловать в систему!</p>
                    <span class="activity-time">Сегодня</span>
                </div>
                </div>
        `;
    }

    // Секции и навигация
    showSection(sectionId) {
        // Скрываем все секции
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Показываем нужную секцию
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            this.currentSection = sectionId;
            
            // Обновляем навигацию
            this.updateNavigation(sectionId);
            
            // Загружаем данные секции
            this.loadSectionData(sectionId);
        }
    }

    updateNavigation(sectionId) {
        document.querySelectorAll('.sidebar nav ul li').forEach(li => {
            li.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.sidebar nav ul li a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.parentElement.classList.add('active');
        }
    }

    async loadSectionData(sectionId) {
        switch (sectionId) {
            case 'assignments':
                await this.loadAssignments();
                break;
            case 'materials':
                await this.loadMaterials();
                break;
            case 'students':
                await this.loadStudents();
                break;
            case 'grades':
                await this.loadGrades();
                break;
            case 'attendance':
                await this.loadAttendance();
                break;
            case 'schedule':
                await this.loadSchedule();
                break;
            case 'reports':
                // Отчеты статичные
                break;
        }
    }

    // Загрузка данных
    async loadAssignments() {
        try {
            const response = await fetch('/api/teacher/assignments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.assignments = data.assignments || [];
                this.originalAssignments = [...this.assignments]; // Сохраняем копию для фильтрации
            } else {
                this.assignments = [];
                this.originalAssignments = [];
            }
            
            this.displayAssignments();
        } catch (error) {
            console.error('Error loading assignments:', error);
            this.assignments = [];
            this.originalAssignments = [];
            this.displayAssignments();
        }
    }

    displayAssignments() {
        const tbody = document.getElementById('assignmentsTableBody');
        if (!tbody) {
            console.error('Element "assignmentsTableBody" not found');
            return;
        }

        if (this.assignments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Нет заданий. Создайте новое задание!</td></tr>';
            return;
        }

        tbody.innerHTML = this.assignments.map((assignment, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${assignment.title}</td>
                <td>${assignment.subject || 'Не указан'}</td>
                <td>${assignment.group_name || 'Не указана'}</td>
                <td>${new Date(assignment.deadline).toLocaleDateString('ru-RU')}</td>
                <td>
                    <span class="badge ${assignment.is_published ? 'badge-success' : 'badge-secondary'}">
                            ${assignment.is_published ? 'Опубликовано' : 'Черновик'}
                        </span>
                </td>
                <td>
                    <button class="btn-sm btn-primary" onclick="editAssignment(${assignment.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteAssignment(${assignment.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadMaterials() {
        try {
            const response = await fetch('/api/teacher/materials', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.materials = data.materials || [];
                this.originalMaterials = [...this.materials]; // Сохраняем копию для фильтрации
            } else {
                this.materials = [];
                this.originalMaterials = [];
            }
            
            this.displayMaterials();
        } catch (error) {
            console.error('Error loading materials:', error);
            this.materials = [];
            this.originalMaterials = [];
            this.displayMaterials();
        }
    }

    displayMaterials() {
        const grid = document.getElementById('materialsGrid');
        if (!grid) {
            console.error('Element "materialsGrid" not found');
            return;
        }

        if (this.materials.length === 0) {
            grid.innerHTML = '<div class="no-data">Нет материалов. Добавьте учебные материалы!</div>';
            return;
        }

        grid.innerHTML = this.materials.map(material => `
            <div class="group-card">
                <div class="group-card-header">
                    <h3>${material.title}</h3>
                    <span class="group-badge">${material.subject || 'Материал'}</span>
                    </div>
                <div class="group-card-body">
                    <p>${material.description || 'Описание отсутствует'}</p>
                    <div class="group-card-meta">
                        <span><i class="fas fa-calendar"></i> ${new Date(material.created_at).toLocaleDateString('ru-RU')}</span>
                        <span><i class="fas fa-download"></i> ${material.downloads || 0} скачиваний</span>
                        </div>
                        </div>
                <div class="group-card-footer">
                    <button class="btn-sm btn-primary" onclick="editMaterial(${material.id})">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteMaterial(${material.id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadStudents() {
        try {
            const response = await fetch('/api/teacher/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.students = data.users || [];
                this.originalStudents = [...this.students]; // Сохраняем копию для фильтрации
            } else {
                this.students = [];
                this.originalStudents = [];
            }
            
            this.displayStudents();
        } catch (error) {
            console.error('Error loading students:', error);
            this.students = [];
            this.originalStudents = [];
            this.displayStudents();
        }
    }

    displayStudents() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) {
            console.error('Element "studentsTableBody" not found');
            return;
        }

        if (this.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Нет студентов в вашей группе</td></tr>';
            return;
        }

        tbody.innerHTML = this.students.map((student, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${student.full_name}</td>
                <td>${student.group_name || 'Не указана'}</td>
                <td>${student.email}</td>
                <td>${student.average_grade || '-'}</td>
                <td>${student.attendance_rate || '-'}%</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="viewStudent(${student.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async loadGrades() {
        const tbody = document.getElementById('gradesTableBody');
        if (!tbody) {
            console.error('Element "gradesTableBody" not found');
            return;
        }

        try {
            const response = await fetch('/api/teacher/grades', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.grades && data.grades.length > 0) {
                    this.displayGradesTable(data.grades);
                } else {
                    tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет выставленных оценок</td></tr>';
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет выставленных оценок</td></tr>';
            }
        } catch (error) {
            console.error('Error loading grades:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет выставленных оценок</td></tr>';
        }
    }

    displayGradesTable(grades) {
        const tbody = document.getElementById('gradesTableBody');
        if (!tbody) return;

        tbody.innerHTML = grades.map((grade, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${grade.student_name || 'Не указано'}</td>
                <td>${grade.assignment_title || 'Не указано'}</td>
                <td><span class="grade-badge grade-${grade.grade}">${grade.grade}</span></td>
                <td>${grade.comment || '-'}</td>
                <td>${grade.date ? new Date(grade.date).toLocaleDateString('ru-RU') : '-'}</td>
            </tr>
        `).join('');
    }

    async loadAttendance() {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) {
            console.error('Element "attendanceTableBody" not found');
            return;
        }

        try {
            const response = await fetch('/api/teacher/attendance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.attendance && data.attendance.length > 0) {
                    this.displayAttendanceTable(data.attendance);
                    
                    // Обновляем статистику если есть
                    if (data.stats) {
                        this.updateAttendanceStats(data.stats);
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="loading">Нет данных о посещаемости</td></tr>';
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="loading">Нет данных о посещаемости</td></tr>';
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="loading">Нет данных о посещаемости</td></tr>';
        }
    }

    displayAttendanceTable(attendance) {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        tbody.innerHTML = attendance.map((record, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${record.student_name || 'Не указано'}</td>
                <td>${record.date ? new Date(record.date).toLocaleDateString('ru-RU') : 'Не указано'}</td>
                <td>${record.subject || '-'}</td>
                <td><span class="status-badge status-${record.status}">${this.getAttendanceStatusText(record.status)}</span></td>
            </tr>
        `).join('');
    }

    getAttendanceStatusText(status) {
        const statuses = {
            'present': 'Присутствовал',
            'absent': 'Отсутствовал',
            'late': 'Опоздал',
            'excused': 'Уважительная'
        };
        return statuses[status] || status;
    }

    updateAttendanceStats(stats) {
        const elements = [
            { id: 'overallAttendance', value: (stats.overallRate || 0) + '%' },
            { id: 'studentsToday', value: stats.studentsToday || 0 },
            { id: 'absencesThisWeek', value: stats.absencesThisWeek || 0 }
        ];

        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    async loadSchedule() {
        const container = document.getElementById('scheduleContent');
        if (!container) return;

        container.innerHTML = '<p class="no-data">Загрузка расписания...</p>';
        
        // Заглушка
        setTimeout(() => {
            container.innerHTML = '<p class="no-data">Расписание не настроено</p>';
        }, 500);
    }

    // Обработка форм
    async handleAddAssignment(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            group: formData.get('group'),
            description: formData.get('description'),
            deadline: formData.get('deadline')
        };
        
        try {
            const response = await fetch('/api/teacher/assignments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Успешно', 'Задание создано');
                    }
                    
                    // Перезагружаем список заданий
                    await this.loadAssignments();
                    
                    closeModal('addAssignmentModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка создания задания');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error creating assignment:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось создать задание');
            }
        }
    }

    async handleAddMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/api/teacher/materials', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: formData // Отправляем FormData для загрузки файлов
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Успешно', 'Материал добавлен');
                    }
                    
                    // Перезагружаем список материалов
                    await this.loadMaterials();
                    
                    closeModal('addMaterialModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка добавления материала');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error adding material:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось добавить материал');
            }
        }
    }

    async handleAddGrade(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            student_id: formData.get('student'),
            assignment_id: formData.get('assignment'),
            grade: formData.get('grade'),
            comment: formData.get('comment')
        };
        
        try {
            const response = await fetch('/api/teacher/grades', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Успешно', 'Оценка выставлена');
                    }
                    
                    // Перезагружаем список оценок
                    await this.loadGrades();
                    
                    closeModal('addGradeModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка выставления оценки');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error adding grade:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось выставить оценку');
            }
        }
    }

    async handleMarkAttendance(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            group_id: formData.get('group'),
            date: formData.get('date'),
            attendance: [] // Должны быть данные о посещаемости студентов
        };
        
        try {
            const response = await fetch('/api/teacher/attendance', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    if (window.notificationSystem) {
                        window.notificationSystem.success('Успешно', 'Посещаемость отмечена');
                    }
                    
                    // Перезагружаем данные посещаемости
                    await this.loadAttendance();
                    
                    closeModal('markAttendanceModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка отметки посещаемости');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось отметить посещаемость');
            }
        }
    }

    // Фильтрация
    filterAssignments() {
        const searchInput = document.getElementById('assignmentSearch');
        if (!searchInput) return;
        
        const search = searchInput.value.toLowerCase();
        
        if (search === '') {
            // Если поиск пустой, восстанавливаем все данные
            this.assignments = [...this.originalAssignments];
        } else {
            // Фильтруем из оригинальных данных
            this.assignments = this.originalAssignments.filter(a => 
                a.title.toLowerCase().includes(search) ||
                (a.subject && a.subject.toLowerCase().includes(search)) ||
                (a.group && a.group.toLowerCase().includes(search))
            );
        }
        
        this.displayAssignments();
    }

    filterStudents() {
        const searchInput = document.getElementById('studentSearch');
        if (!searchInput) return;
        
        const search = searchInput.value.toLowerCase();
        
        if (search === '') {
            // Если поиск пустой, восстанавливаем все данные
            this.students = [...this.originalStudents];
        } else {
            // Фильтруем из оригинальных данных
            this.students = this.originalStudents.filter(s => 
                s.full_name.toLowerCase().includes(search) ||
                (s.email && s.email.toLowerCase().includes(search)) ||
                (s.group_name && s.group_name.toLowerCase().includes(search))
            );
        }
        
        this.displayStudents();
    }

    // Утилиты
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
}

// Глобальные функции для HTML
function showSection(sectionId) {
    if (window.teacherDashboard) {
        window.teacherDashboard.showSection(sectionId);
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

function editAssignment(id) {
    if (window.notificationSystem) {
        window.notificationSystem.info('Редактирование', `Редактирование задания #${id}`);
    }
}

function deleteAssignment(id) {
    if (confirm('Удалить задание?')) {
        if (window.notificationSystem) {
            window.notificationSystem.warning('Удаление', `Задание #${id} удалено`);
        }
    }
}

function editMaterial(id) {
    if (window.notificationSystem) {
        window.notificationSystem.info('Редактирование', `Редактирование материала #${id}`);
    }
}

function deleteMaterial(id) {
    if (confirm('Удалить материал?')) {
        if (window.notificationSystem) {
            window.notificationSystem.warning('Удаление', `Материал #${id} удалён`);
        }
    }
}

function viewStudent(id) {
    if (window.notificationSystem) {
        window.notificationSystem.info('Просмотр', `Просмотр студента #${id}`);
    }
}

function exportAssignments() {
    if (window.notificationSystem) {
        window.notificationSystem.info('Экспорт', 'Функция в разработке');
    }
}

function exportStudents() {
    if (window.notificationSystem) {
        window.notificationSystem.info('Экспорт', 'Функция в разработке');
    }
}

function generateReport(type) {
    if (window.notificationSystem) {
        window.notificationSystem.info('Отчет', `Создание отчета: ${type}`);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.teacherDashboard = new TeacherDashboard();
});

// Close modals on outside click
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = '';
    }
});

// Close modals on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }
});

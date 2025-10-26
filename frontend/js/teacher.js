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
        this.setupNavigationListeners();
        this.loadDashboardData();
        
        // Обработка хеша URL при загрузке страницы
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== 'dashboard') {
            this.showSection(hash);
        }
    }

    async checkAuthentication() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = '/';
            return;
        }
        
        try {
            // Проверяем токен на сервере
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const user = data.user;
                
                // Сохраняем данные пользователя в localStorage
                localStorage.setItem('userData', JSON.stringify(user));
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userId', user.id);
                
                // Проверяем роль
                if (user.role !== 'teacher') {
                    if (user.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/lk.html';
                    }
                    return;
                }
                
                // Загружаем данные преподавателя
                await this.loadTeacherInfo();
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Authentication error:', error);
            window.location.href = '/';
        }
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

        const editAssignmentForm = document.getElementById('editAssignmentForm');
        if (editAssignmentForm) {
            editAssignmentForm.addEventListener('submit', this.handleEditAssignment.bind(this));
        }

        const addMaterialForm = document.getElementById('addMaterialForm');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', this.handleAddMaterial.bind(this));
        }

        const editMaterialForm = document.getElementById('editMaterialForm');
        if (editMaterialForm) {
            editMaterialForm.addEventListener('submit', this.handleEditMaterial.bind(this));
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

        // Обработчик выбора группы в форме посещаемости
        const attendanceGroupSelect = document.getElementById('attendanceGroup');
        if (attendanceGroupSelect) {
            attendanceGroupSelect.addEventListener('change', this.handleAttendanceGroupChange.bind(this));
        }

        // Динамический предпросмотр оценки при вводе баллов
        const gradePointsInput = document.getElementById('gradePoints');
        const gradeMaxPointsInput = document.getElementById('gradeMaxPoints');
        if (gradePointsInput && gradeMaxPointsInput) {
            gradePointsInput.addEventListener('input', this.updateGradePreview.bind(this));
            gradeMaxPointsInput.addEventListener('input', this.updateGradePreview.bind(this));
        }
    }

    setupNavigationListeners() {
        // Обработка кликов по ссылкам навигации
        document.querySelectorAll('.sidebar nav ul li a, .mobile-menu-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const sectionId = href.replace('#', '');
                    this.showSection(sectionId);
                    // Обновляем URL
                    window.location.hash = sectionId;
                }
            });
        });

        // Обработка изменения хеша (кнопки назад/вперед браузера)
        window.addEventListener('hashchange', () => {
            // Проверяем аутентификацию перед переключением секции
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/';
                return;
            }
            
            const hash = window.location.hash.replace('#', '');
            if (hash) {
                this.showSection(hash);
            } else {
                this.showSection('dashboard');
            }
        });
        
        // Проверка аутентификации при возврате на вкладку
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/';
                }
            }
        });
    }

    updateGradePreview() {
        const pointsInput = document.getElementById('gradePoints');
        const maxPointsInput = document.getElementById('gradeMaxPoints');
        const preview = document.getElementById('gradePreview');
        const previewText = document.getElementById('gradePreviewText');

        if (!pointsInput || !maxPointsInput || !preview || !previewText) return;

        const points = parseInt(pointsInput.value);
        const maxPoints = parseInt(maxPointsInput.value);

        if (isNaN(points) || isNaN(maxPoints) || maxPoints <= 0) {
            preview.style.display = 'none';
            return;
        }

        const percentage = (points / maxPoints) * 100;
        let grade, gradeText, gradeColor;
        
        if (percentage >= 90) {
            grade = 5;
            gradeText = 'Отлично';
            gradeColor = '#4caf50';
        } else if (percentage >= 75) {
            grade = 4;
            gradeText = 'Хорошо';
            gradeColor = '#2196f3';
        } else if (percentage >= 60) {
            grade = 3;
            gradeText = 'Удовлетворительно';
            gradeColor = '#ff9800';
        } else {
            grade = 2;
            gradeText = 'Неудовлетворительно';
            gradeColor = '#f44336';
        }

        preview.style.display = 'block';
        previewText.innerHTML = `
            <span style="color: ${gradeColor}; font-weight: bold; font-size: 1.2em;">${grade}</span>
            <span style="color: var(--text-color);"> (${gradeText})</span>
            <span style="color: var(--light-text);"> - ${percentage.toFixed(1)}%</span>
        `;
    }

    async loadDashboardData() {
        this.showLoading(true);
        
        try {
        await Promise.all([
                this.loadStats(),
                this.loadRecentActivity(),
                this.loadDropdownData() // Загружаем данные для форм
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async loadDropdownData() {
        try {
            // Загружаем предметы, группы, студентов и задания для форм
            await Promise.all([
                this.loadSubjectsForForms(),
                this.loadGroupsForForms(),
                this.loadStudentsForForms(),
                this.loadAssignmentsForForms()
            ]);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    async loadSubjectsForForms() {
        try {
            const response = await fetch('/api/teacher/subjects', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.subjects = data.subjects || [];
                this.populateSubjectDropdowns();
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    async loadGroupsForForms() {
        try {
            const response = await fetch('/api/teacher/groups', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.groups = data.groups || [];
                this.populateGroupDropdowns();
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    async loadStudentsForForms() {
        try {
            const response = await fetch('/api/teacher/students', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.allStudents = data.users || [];
                this.populateStudentDropdowns();
            }
        } catch (error) {
            console.error('Error loading students for forms:', error);
        }
    }

    async loadAssignmentsForForms() {
        try {
            const response = await fetch('/api/teacher/assignments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.allAssignments = data.assignments || [];
                this.populateAssignmentDropdowns();
            }
        } catch (error) {
            console.error('Error loading assignments for forms:', error);
        }
    }

    populateSubjectDropdowns() {
        const selects = ['assignmentSubject', 'editAssignmentSubject', 'materialSubject', 'editMaterialSubject', 'gradeSubject', 'attendanceSubject'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select && this.subjects) {
                select.innerHTML = '<option value="">Выберите предмет</option>' +
                    this.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            }
        });
    }

    populateGroupDropdowns() {
        const selects = ['assignmentGroup', 'editAssignmentGroup', 'attendanceGroup'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select && this.groups) {
                select.innerHTML = '<option value="">Выберите группу</option>' +
                    this.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            }
        });
    }

    populateStudentDropdowns() {
        const select = document.getElementById('gradeStudent');
        if (select && this.allStudents) {
            select.innerHTML = '<option value="">Выберите студента</option>' +
                this.allStudents.map(s => `<option value="${s.id}">${s.full_name} (${s.group_name || 'Без группы'})</option>`).join('');
        }
    }

    populateAssignmentDropdowns() {
        const select = document.getElementById('gradeAssignment');
        if (select && this.allAssignments) {
            select.innerHTML = '<option value="">Выберите задание</option>' +
                this.allAssignments.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
        }
    }

    async handleAttendanceGroupChange(e) {
        const groupId = e.target.value;
        const container = document.getElementById('studentAttendanceList');
        
        if (!groupId || !container) return;

        container.innerHTML = '<p style="text-align: center; padding: 20px;">Загрузка студентов...</p>';

        try {
            const response = await fetch(`/api/teacher/groups/${groupId}/students`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const students = data.students || [];

                if (students.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: var(--light-text); padding: 20px;">В группе нет студентов</p>';
                    return;
                }

                container.innerHTML = students.map(student => `
                    <div class="student-attendance-item">
                        <div class="student-name">
                            <i class="fas fa-user-circle"></i>
                            <strong>${student.full_name}</strong>
                        </div>
                        <div class="attendance-buttons">
                            <label class="attendance-btn present">
                                <input type="radio" name="attendance_${student.id}" value="present" checked>
                                <span class="btn-content">
                                    <i class="fas fa-check-circle"></i>
                                    <span class="btn-text">Присутствовал</span>
                                </span>
                            </label>
                            <label class="attendance-btn absent">
                                <input type="radio" name="attendance_${student.id}" value="absent">
                                <span class="btn-content">
                                    <i class="fas fa-times-circle"></i>
                                    <span class="btn-text">Отсутствовал</span>
                                </span>
                            </label>
                            <label class="attendance-btn late">
                                <input type="radio" name="attendance_${student.id}" value="late">
                                <span class="btn-content">
                                    <i class="fas fa-clock"></i>
                                    <span class="btn-text">Опоздал</span>
                                </span>
                            </label>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Ошибка загрузки студентов</p>';
            }
        } catch (error) {
            console.error('Error loading group students:', error);
            container.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Ошибка загрузки студентов</p>';
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

        try {
            const response = await fetch('/api/teacher/activity?limit=5', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const activities = data.activities || [];

                if (activities.length === 0) {
                    container.innerHTML = `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="fas fa-info-circle"></i>
                            </div>
                            <div class="activity-content">
                                <p>Нет последней активности</p>
                                <span class="activity-time">Начните работу!</span>
                            </div>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = activities.map(activity => {
                    // Форматируем время
                    const timeAgo = this.formatTimeAgo(activity.time);
                    
                    return `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <i class="fas ${activity.icon}"></i>
                            </div>
                            <div class="activity-content">
                                <p>${activity.description}</p>
                                <span class="activity-time">${timeAgo}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                // В случае ошибки показываем заглушку
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="activity-content">
                            <p>Не удалось загрузить активность</p>
                            <span class="activity-time">Попробуйте позже</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading activity:', error);
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="activity-content">
                        <p>Ошибка загрузки активности</p>
                        <span class="activity-time">Попробуйте обновить страницу</span>
                    </div>
                </div>
            `;
        }
    }

    // Форматирование времени "назад"
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'только что';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} ${this.pluralize(minutes, 'минуту', 'минуты', 'минут')} назад`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ${this.pluralize(hours, 'час', 'часа', 'часов')} назад`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} ${this.pluralize(days, 'день', 'дня', 'дней')} назад`;
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} ${this.pluralize(weeks, 'неделю', 'недели', 'недель')} назад`;
        
        return date.toLocaleDateString('ru-RU');
    }

    // Функция для правильного склонения
    pluralize(count, one, few, many) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
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
            case 'dashboard':
                // При возврате на панель управления обновляем статистику
                await this.loadStats();
                await this.loadRecentActivity();
                break;
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
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Нет заданий. Создайте новое задание!</td></tr>';
            return;
        }

        tbody.innerHTML = this.assignments.map((assignment, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${assignment.title}</td>
                <td>${assignment.subject_name || 'Не указан'}</td>
                <td>${assignment.group_name || 'Не указана'}</td>
                <td>${new Date(assignment.deadline).toLocaleDateString('ru-RU')}</td>
                <td>
                    <span class="badge badge-info">
                        <i class="fas fa-star"></i> ${assignment.max_points || 100}
                    </span>
                </td>
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

        tbody.innerHTML = grades.map((grade, index) => {
            // Форматирование баллов и оценки
            let gradeDisplay = '';
            if (grade.points !== undefined && grade.max_points) {
                const percentage = ((grade.points / grade.max_points) * 100).toFixed(1);
                gradeDisplay = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <span class="grade-badge grade-${grade.grade}">${grade.grade}</span>
                        <small style="color: var(--light-text);">${grade.points}/${grade.max_points} (${percentage}%)</small>
                    </div>
                `;
            } else if (grade.grade) {
                gradeDisplay = `<span class="grade-badge grade-${grade.grade}">${grade.grade}</span>`;
            } else {
                gradeDisplay = '-';
            }
            
            return `
                <tr>
                    <td>${grade.student_name || 'Не указано'}</td>
                    <td>${grade.group_name || '-'}</td>
                    <td>${grade.assignment_title || grade.subject_name || 'Не указано'}</td>
                    <td>${gradeDisplay}</td>
                    <td>${new Date(grade.created_at || Date.now()).toLocaleDateString('ru-RU')}</td>
                    <td>
                        <button class="btn-sm btn-danger" onclick="deleteGrade(${grade.id})" title="Удалить оценку">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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
                    tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет данных о посещаемости</td></tr>';
                }
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет данных о посещаемости</td></tr>';
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Нет данных о посещаемости</td></tr>';
        }
    }

    displayAttendanceTable(attendance) {
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        tbody.innerHTML = attendance.map((record, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${record.student_name || 'Не указано'}</td>
                <td>${record.group_full_name || record.group_name || '-'}</td>
                <td>${record.subject_name || '-'}</td>
                <td>${record.date ? new Date(record.date).toLocaleDateString('ru-RU') : 'Не указано'}</td>
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
            deadline: formData.get('deadline'),
            max_points: parseInt(formData.get('max_points')) || 100
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
                    
                    // Перезагружаем список заданий и статистику
                    await this.loadAssignments();
                    await this.loadStats();
                    
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

    async handleEditAssignment(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const id = formData.get('id');
        const data = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            group: formData.get('group'),
            description: formData.get('description'),
            deadline: formData.get('deadline'),
            max_points: parseInt(formData.get('max_points')) || 100
        };
        
        try {
            const response = await fetch(`/api/teacher/assignments/${id}`, {
                method: 'PUT',
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
                        window.notificationSystem.success('Успешно', 'Задание обновлено');
                    }
                    
                    // Перезагружаем список заданий и статистику
                    await this.loadAssignments();
                    await this.loadStats();
                    
                    closeModal('editAssignmentModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка обновления задания');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось обновить задание');
            }
        }
    }

    async handleAddMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            description: formData.get('description'),
            file_url: null // Пока файлы не загружаем, можно добавить URL вручную
        };
        
        try {
            const response = await fetch('/api/teacher/materials', {
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
                        window.notificationSystem.success('Успешно', 'Материал добавлен');
                    }
                    
                    // Перезагружаем список материалов и статистику
                    await this.loadMaterials();
                    await this.loadStats();
                    
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

    async handleEditMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const id = formData.get('id');
        const data = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            description: formData.get('description'),
            file_url: formData.get('file_url')
        };
        
        try {
            const response = await fetch(`/api/teacher/materials/${id}`, {
                method: 'PUT',
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
                        window.notificationSystem.success('Успешно', 'Материал обновлён');
                    }
                    
                    // Перезагружаем список материалов и статистику
                    await this.loadMaterials();
                    await this.loadStats();
                    
                    closeModal('editMaterialModal');
                    e.target.reset();
                } else {
                    throw new Error(result.message || 'Ошибка обновления материала');
                }
            } else {
                throw new Error('Ошибка сервера');
            }
        } catch (error) {
            console.error('Error updating material:', error);
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', error.message || 'Не удалось обновить материал');
            }
        }
    }

    async handleAddGrade(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const points = parseInt(formData.get('points'));
        const maxPoints = parseInt(formData.get('max_points'));
        
        // Валидация баллов
        if (isNaN(points) || isNaN(maxPoints) || points < 0 || maxPoints <= 0 || points > maxPoints) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', 'Проверьте правильность введенных баллов');
            }
            return;
        }
        
        // Автоматический расчёт оценки на основе процента
        const percentage = (points / maxPoints) * 100;
        let grade;
        if (percentage >= 90) grade = 5;
        else if (percentage >= 75) grade = 4;
        else if (percentage >= 60) grade = 3;
        else grade = 2;
        
        const data = {
            student_id: parseInt(formData.get('student')),
            assignment_id: parseInt(formData.get('assignment')),
            subject_id: parseInt(formData.get('subject')),
            points: points,
            max_points: maxPoints,
            grade: grade,
            comment: formData.get('comment'),
            semester: 1, // можно сделать динамическим
            academic_year: '2024-2025' // можно сделать динамическим
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
                        window.notificationSystem.success('Успешно', `Выставлено ${points}/${maxPoints} баллов (оценка: ${grade})`);
                    }
                    
                    // Перезагружаем список оценок и статистику
                    await this.loadGrades();
                    await this.loadStats();
                    
                    closeModal('addGradeModal');
                    e.target.reset();
                    // Возвращаем значение по умолчанию для макс баллов
                    document.getElementById('gradeMaxPoints').value = '100';
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
        const groupId = formData.get('group');
        const subjectId = formData.get('subject');
        const date = formData.get('date');
        
        if (!groupId || !subjectId || !date) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', 'Заполните все обязательные поля');
            }
            return;
        }

        // Собираем данные о посещаемости студентов
        const attendanceRecords = [];
        const container = document.getElementById('studentAttendanceList');
        if (container) {
            const studentItems = container.querySelectorAll('.student-attendance-item');
            studentItems.forEach(item => {
                const radios = item.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    if (radio.checked) {
                        const studentId = radio.name.replace('attendance_', '');
                        attendanceRecords.push({
                            student_id: parseInt(studentId),
                            status: radio.value
                        });
                    }
                });
            });
        }

        if (attendanceRecords.length === 0) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Ошибка', 'Выберите группу и отметьте посещаемость');
            }
            return;
        }
        
        const data = {
            group_id: parseInt(groupId),
            subject_id: parseInt(subjectId),
            date: date,
            time: new Date().toTimeString().slice(0, 5), // Текущее время HH:MM
            attendance_records: attendanceRecords
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
                        window.notificationSystem.success('Успешно', `Посещаемость отмечена для ${result.count} студентов`);
                    }
                    
                    // Перезагружаем данные посещаемости и статистику
                    await this.loadAttendance();
                    await this.loadStats();
                    
                    closeModal('markAttendanceModal');
                    e.target.reset();
                    // Очищаем список студентов
                    if (container) {
                        container.innerHTML = '<p style="text-align: center; color: var(--light-text); padding: 20px;">Выберите группу для загрузки списка студентов</p>';
                    }
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

// Глобальные функции для редактирования
async function editAssignment(id) {
    if (!window.teacherDashboard) return;
    
    // Находим задание по ID
    const assignment = window.teacherDashboard.assignments.find(a => a.id === id);
    if (!assignment) {
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка', 'Задание не найдено');
        }
        return;
    }
    
    // СНАЧАЛА заполняем выпадающие списки
    window.teacherDashboard.populateSubjectDropdowns();
    window.teacherDashboard.populateGroupDropdowns();
    
    console.log('Editing assignment:', assignment);
    console.log('Subject ID:', assignment.subject_id, 'Group ID:', assignment.group_id);
    
    // ПОТОМ заполняем форму редактирования с установкой значений
    document.getElementById('editAssignmentId').value = assignment.id;
    document.getElementById('editAssignmentTitle').value = assignment.title;
    document.getElementById('editAssignmentSubject').value = assignment.subject_id || '';
    document.getElementById('editAssignmentGroup').value = assignment.group_id || '';
    document.getElementById('editAssignmentDescription').value = assignment.description || '';
    document.getElementById('editAssignmentMaxPoints').value = assignment.max_points || 100;
    
    // Форматируем дату для datetime-local input
    if (assignment.deadline) {
        const date = new Date(assignment.deadline);
        const formattedDate = date.toISOString().slice(0, 16);
        document.getElementById('editAssignmentDeadline').value = formattedDate;
    }
    
    // Показываем модальное окно
    showModal('editAssignmentModal');
}

async function editMaterial(id) {
    if (!window.teacherDashboard) return;
    
    // Находим материал по ID
    const material = window.teacherDashboard.materials.find(m => m.id === id);
    if (!material) {
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка', 'Материал не найден');
        }
        return;
    }
    
    // Заполняем форму редактирования
    document.getElementById('editMaterialId').value = material.id;
    document.getElementById('editMaterialTitle').value = material.title;
    document.getElementById('editMaterialSubject').value = material.subject_id || '';
    document.getElementById('editMaterialDescription').value = material.description || '';
    document.getElementById('editMaterialFileUrl').value = material.file_url || '';
    
    // Заполняем выпадающие списки
    window.teacherDashboard.populateSubjectDropdowns();
    
    // Показываем модальное окно
    showModal('editMaterialModal');
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

async function deleteAssignment(id) {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
        return;
    }

    try {
        const response = await fetch(`/api/teacher/assignments/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                if (window.notificationSystem) {
                    window.notificationSystem.success('Успешно', 'Задание удалено');
                }
                
                // Перезагружаем список заданий и статистику
                if (window.teacherDashboard) {
                    await window.teacherDashboard.loadAssignments();
                    await window.teacherDashboard.loadStats();
                }
            } else {
                throw new Error(result.message || 'Ошибка удаления');
            }
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Error deleting assignment:', error);
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка', error.message || 'Не удалось удалить задание');
        }
    }
}

async function deleteMaterial(id) {
    if (!confirm('Вы уверены, что хотите удалить этот материал?')) {
        return;
    }

    try {
        const response = await fetch(`/api/teacher/materials/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                if (window.notificationSystem) {
                    window.notificationSystem.success('Успешно', 'Материал удалён');
                }
                
                // Перезагружаем список материалов и статистику
                if (window.teacherDashboard) {
                    await window.teacherDashboard.loadMaterials();
                    await window.teacherDashboard.loadStats();
                }
            } else {
                throw new Error(result.message || 'Ошибка удаления');
            }
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка', error.message || 'Не удалось удалить материал');
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

async function deleteGrade(id) {
    if (!confirm('Вы уверены, что хотите удалить эту оценку?')) {
        return;
    }

    try {
        const response = await fetch(`/api/teacher/grades/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                if (window.notificationSystem) {
                    window.notificationSystem.success('Успешно', 'Оценка удалена');
                }
                
                // Перезагружаем список оценок и статистику
                if (window.teacherDashboard) {
                    await window.teacherDashboard.loadGrades();
                    await window.teacherDashboard.loadStats();
                }
            } else {
                throw new Error(result.message || 'Ошибка удаления');
            }
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Error deleting grade:', error);
        if (window.notificationSystem) {
            window.notificationSystem.error('Ошибка', error.message || 'Не удалось удалить оценку');
        }
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

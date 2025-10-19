// Admin Panel JavaScript
// Modern admin panel with beautiful UI

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

// Initialize admin panel
async function initializeAdminPanel() {
    try {
        console.log('Initializing admin panel...');
        
        // Check authentication
        await checkAuthentication();
        
        // Initialize navigation
        initializeNavigation();
        
        // Load initial data
        await loadDashboardData();
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showNotification('Ошибка инициализации панели', 'error');
    }
}

// Check user authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    try {
        // Verify token with server
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            if (user.role !== 'admin') {
                console.log('User is not admin, redirecting to lk');
                window.location.href = '/lk.html';
                return;
            }
            
            // Update admin name
            document.getElementById('adminName').textContent = user.fullName || user.name || 'Администратор';
            localStorage.setItem('userData', JSON.stringify(user));
            
        } else {
            console.log('Token verification failed, redirecting to login');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/';
    }
}

// Initialize navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                const sectionId = href.substring(1);
                showSection(sectionId);
                
                // Update active state
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                this.parentElement.classList.add('active');
            }
        });
    });
}

// Show specific section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section data if needed
        loadSectionData(sectionId);
    }
}

// Load data for specific section
async function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'groups':
            await loadGroupsData();
            break;
        case 'attendance':
            await loadAttendanceData();
            break;
        case 'reports':
            await loadReportsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        
        // Load statistics
        const statsResponse = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                updateStatsCards(statsData.stats);
            }
        }
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Ошибка загрузки данных панели', 'error');
    } finally {
        showLoading(false);
    }
}

// Update statistics cards
function updateStatsCards(stats) {
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        totalStudents: document.getElementById('totalStudents'),
        totalTeachers: document.getElementById('totalTeachers'),
        totalGroups: document.getElementById('totalGroups')
    };
    
    if (elements.totalUsers) elements.totalUsers.textContent = stats.total || 0;
    if (elements.totalStudents) elements.totalStudents.textContent = stats.students || 0;
    if (elements.totalTeachers) elements.totalTeachers.textContent = stats.teachers || 0;
    if (elements.totalGroups) elements.totalGroups.textContent = stats.groups || 0;
}

// Load recent activity
async function loadRecentActivity() {
    // This would typically come from an API
    const activities = [
        {
            icon: 'fas fa-user-plus',
            text: 'Новый пользователь зарегистрирован',
            time: '2 минуты назад'
        },
        {
            icon: 'fas fa-edit',
            text: 'Обновлена информация о группе',
            time: '15 минут назад'
        },
        {
            icon: 'fas fa-calendar-check',
            text: 'Отмечена посещаемость',
            time: '1 час назад'
        }
    ];
    
    const activityList = document.getElementById('recentActivity');
    if (activityList) {
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.text}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// Load users data
async function loadUsersData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayUsers(data.users);
            } else {
                showNotification('Ошибка загрузки пользователей', 'error');
            }
        } else {
            showNotification('Ошибка загрузки пользователей', 'error');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Ошибка загрузки пользователей', 'error');
    } finally {
        showLoading(false);
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.full_name || 'Не указано'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${getRoleDisplayName(user.role)}</span></td>
            <td>${user.group_name || 'Не указано'}</td>
            <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <button class="btn-secondary" onclick="editUser(${user.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="deleteUser(${user.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Администратор',
        'teacher': 'Преподаватель',
        'student': 'Студент'
    };
    return roleNames[role] || role;
}

// Load groups data
async function loadGroupsData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayGroups(data.groups);
            } else {
                showNotification('Ошибка загрузки групп', 'error');
            }
        } else {
            showNotification('Ошибка загрузки групп', 'error');
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        showNotification('Ошибка загрузки групп', 'error');
    } finally {
        showLoading(false);
    }
}

// Display groups
function displayGroups(groups) {
    const groupsGrid = document.getElementById('groupsGrid');
    if (!groupsGrid) return;
    
    if (groups.length === 0) {
        groupsGrid.innerHTML = '<div class="loading">Группы не найдены</div>';
        return;
    }
    
    groupsGrid.innerHTML = groups.map(group => `
        <div class="group-card">
            <div class="group-header">
                <div class="group-name">${group.name}</div>
                <div class="group-students">${group.student_count || 0} студентов</div>
            </div>
            <div class="group-info">
                <p><strong>Специальность:</strong> ${group.specialty || 'Не указано'}</p>
                <p><strong>Год:</strong> ${group.year || 'Не указан'}</p>
                <p><strong>Описание:</strong> ${group.description || 'Нет описания'}</p>
            </div>
            <div class="group-actions">
                <button class="btn-primary" onclick="editGroup(${group.id})">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn-secondary" onclick="deleteGroup(${group.id})">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            </div>
        </div>
    `).join('');
}

// Load attendance data
async function loadAttendanceData() {
    try {
        showLoading(true);
        
        // Load attendance stats
        const statsResponse = await fetch('/api/admin/attendance/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success) {
                updateAttendanceStats(statsData.stats);
            }
        }
        
        // Load attendance records
        const response = await fetch('/api/admin/attendance', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayAttendance(data.attendance);
            }
        }
        
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

// Update attendance statistics
function updateAttendanceStats(stats) {
    const elements = {
        overallAttendance: document.getElementById('overallAttendance'),
        studentsToday: document.getElementById('studentsToday'),
        absencesThisWeek: document.getElementById('absencesThisWeek')
    };
    
    if (elements.overallAttendance) elements.overallAttendance.textContent = `${Math.round(stats.overallAttendance || 0)}%`;
    if (elements.studentsToday) elements.studentsToday.textContent = stats.studentsToday || 0;
    if (elements.absencesThisWeek) elements.absencesThisWeek.textContent = stats.absencesThisWeek || 0;
}

// Display attendance records
function displayAttendance(attendance) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    if (attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Записи посещаемости не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = attendance.map(record => `
        <tr>
            <td>${record.student_name || 'Не указано'}</td>
            <td>${record.group_name || 'Не указано'}</td>
            <td>${record.subject_name || 'Не указано'}</td>
            <td>${formatDate(record.date)}</td>
            <td><span class="status-badge status-${record.status}">${getStatusDisplayName(record.status)}</span></td>
            <td>
                <button class="btn-secondary" onclick="editAttendance(${record.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary" onclick="deleteAttendance(${record.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get status display name
function getStatusDisplayName(status) {
    const statusNames = {
        'present': 'Присутствовал',
        'absent': 'Отсутствовал',
        'late': 'Опоздал'
    };
    return statusNames[status] || status;
}

// Load reports data
async function loadReportsData() {
    // Reports data would be loaded here
    console.log('Loading reports data...');
}

// Load settings data
async function loadSettingsData() {
    // Settings data would be loaded here
    console.log('Loading settings data...');
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            searchUsers(this.value);
        });
    }
    
    // Form submissions
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    const addGroupForm = document.getElementById('addGroupForm');
    if (addGroupForm) {
        addGroupForm.addEventListener('submit', handleAddGroup);
    }
    
    // Edit user form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    // Edit group form
    const editGroupForm = document.getElementById('editGroupForm');
    if (editGroupForm) {
        editGroupForm.addEventListener('submit', handleEditGroup);
    }
    
    // Attendance form
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleAttendance);
    }
    
    // Edit attendance form
    const editAttendanceForm = document.getElementById('editAttendanceForm');
    if (editAttendanceForm) {
        editAttendanceForm.addEventListener('submit', handleEditAttendance);
    }
    
    // Reports form
    const reportsForm = document.getElementById('reportsForm');
    if (reportsForm) {
        reportsForm.addEventListener('submit', handleReports);
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettings);
    }
}

// Search users
function searchUsers(query) {
    const rows = document.querySelectorAll('#usersTableBody tr');
    const searchTerm = query.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Утилиты перенесены в utils.js

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Modal functions
async function showAddUserModal() {
    await loadGroupsForUserForm();
    showModal('addUserModal');
    
    // Setup role-based fields after modal is shown
    setTimeout(() => {
        setupRoleBasedFields();
    }, 300);
}

// Add event delegation for role changes
document.addEventListener('change', function(event) {
    if (event.target && event.target.id === 'userRole') {
        const specialtyGroup = document.getElementById('specialtyGroup');
        const groupGroup = document.getElementById('groupGroup');
        
        if (specialtyGroup && groupGroup) {
            toggleFieldsBasedOnRole(event.target.value, specialtyGroup, groupGroup);
        }
    }
});


// Load groups for user form dropdown
async function loadGroupsForUserForm() {
    try {
        console.log('Loading groups for user form...');
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Groups response:', data);
            if (data.success) {
                populateGroupDropdown(data.groups, 'userGroup');
                console.log('Groups loaded successfully:', data.groups.length);
            } else {
                console.warn('Failed to load groups:', data.message);
                populateGroupDropdown([], 'userGroup');
            }
        } else {
            console.warn('Failed to load groups, status:', response.status);
            populateGroupDropdown([], 'userGroup');
        }
    } catch (error) {
        console.error('Error loading groups for user form:', error);
        populateGroupDropdown([], 'userGroup');
    }
}

// Load groups for edit user form dropdown
async function loadGroupsForEditForm() {
    try {
        console.log('Loading groups for edit user form...');
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Groups response for edit:', data);
            if (data.success) {
                populateGroupDropdown(data.groups, 'editUserGroup');
                console.log('Groups loaded successfully for edit:', data.groups.length);
            } else {
                console.warn('Failed to load groups for edit:', data.message);
                populateGroupDropdown([], 'editUserGroup');
            }
        } else {
            console.warn('Failed to load groups for edit, status:', response.status);
            populateGroupDropdown([], 'editUserGroup');
        }
    } catch (error) {
        console.error('Error loading groups for edit form:', error);
        populateGroupDropdown([], 'editUserGroup');
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Setup role-based field visibility
function setupRoleBasedFields() {
    const roleSelect = document.getElementById('userRole');
    const specialtyGroup = document.getElementById('specialtyGroup');
    const groupGroup = document.getElementById('groupGroup');
    
    if (!roleSelect || !specialtyGroup || !groupGroup) {
        console.warn('Role-based fields not found');
        return;
    }
    
    console.log('Setting up role-based fields');
    
    // Remove any existing event listeners
    const newRoleSelect = roleSelect.cloneNode(true);
    roleSelect.parentNode.replaceChild(newRoleSelect, roleSelect);
    
    // Add event listener for role changes
    newRoleSelect.addEventListener('change', function() {
        console.log('Role changed to:', this.value);
        toggleFieldsBasedOnRole(this.value, specialtyGroup, groupGroup);
    });
    
    // Set initial state
    console.log('Initial role:', newRoleSelect.value);
    toggleFieldsBasedOnRole(newRoleSelect.value, specialtyGroup, groupGroup);
}

// Toggle fields based on selected role
function toggleFieldsBasedOnRole(role, specialtyGroup, groupGroup) {
    if (!specialtyGroup || !groupGroup) {
        console.warn('Specialty or group elements not found');
        return;
    }
    
    console.log('Toggling fields for role:', role);
    
    // Reset fields
    specialtyGroup.classList.remove('hidden');
    groupGroup.classList.remove('hidden');
    
    // Clear values when hiding
    const specialtySelect = document.getElementById('userSpecialty');
    const groupSelect = document.getElementById('userGroup');
    const specialtyLabel = specialtyGroup.querySelector('label');
    const groupLabel = groupGroup.querySelector('label');
    
    if (role === 'teacher') {
        // For teachers: hide group, show specialty
        console.log('Setting up teacher fields');
        groupGroup.classList.add('hidden');
        specialtyGroup.classList.remove('hidden');
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа';
        
        // Ensure specialty dropdown is visible and clickable
        if (specialtySelect) {
            specialtySelect.style.display = 'block';
            specialtySelect.style.pointerEvents = 'auto';
            specialtySelect.style.zIndex = '10';
            console.log('Specialty select element:', specialtySelect);
        }
    } else if (role === 'admin') {
        // For admins: hide both group and specialty
        console.log('Setting up admin fields');
        specialtyGroup.classList.add('hidden');
        groupGroup.classList.add('hidden');
        if (specialtySelect) specialtySelect.value = '';
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'student') {
        // For students: show both group and specialty
        console.log('Setting up student fields');
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа *';
    } else {
        // Default: show both
        console.log('Setting up default fields');
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    }
}

function showAddGroupModal() {
    showModal('addGroupModal');
}


// Clear user form when modal is closed
function clearUserForm() {
    const form = document.getElementById('addUserForm');
    if (form) {
        form.reset();
        
        // Reset field visibility
        const specialtyGroup = document.getElementById('specialtyGroup');
        const groupGroup = document.getElementById('groupGroup');
        
        if (specialtyGroup && groupGroup) {
            specialtyGroup.classList.remove('hidden');
            groupGroup.classList.remove('hidden');
        }
    }
}

async function showAttendanceModal() {
    await loadGroupsForAttendanceForm();
    showModal('attendanceModal');
}

function showReportModal() {
    loadGroupsForReportForm();
    showModal('reportsModal');
}

function showSettingsModal() {
    loadSettingsData();
    showModal('settingsModal');
}

// Form handlers
async function handleAddUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        full_name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        specialty: formData.get('specialty'),
        group_name: formData.get('group')
    };
    
    // Валидация
    if (!userData.full_name || !userData.email || !userData.password || !userData.role) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    if (userData.password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    if (!isValidEmail(userData.email)) {
        showNotification('Введите корректный email адрес', 'error');
        return;
    }
    
    // Валидация в зависимости от роли
    if (userData.role === 'student') {
        if (!userData.specialty) {
            showNotification('Для студента необходимо указать специальность', 'error');
            return;
        }
        if (!userData.group_name) {
            showNotification('Для студента необходимо указать группу', 'error');
            return;
        }
    } else if (userData.role === 'teacher') {
        if (!userData.specialty) {
            showNotification('Для преподавателя необходимо указать специальность', 'error');
            return;
        }
    }
    
    try {
        showLoading(true);
        
        // Отключаем кнопку отправки
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Создание...';
        
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Пользователь успешно создан', 'success');
                closeModal('addUserModal');
                event.target.reset();
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка создания пользователя', 'error');
            }
        } else {
            const error = await response.json();
            let errorMessage = 'Ошибка создания пользователя';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (response.status === 400) {
                errorMessage = 'Проверьте правильность заполнения полей';
            } else if (response.status === 409) {
                errorMessage = 'Пользователь с таким email уже существует';
            } else if (response.status === 500) {
                errorMessage = 'Внутренняя ошибка сервера';
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Ошибка создания пользователя', 'error');
    } finally {
        showLoading(false);
        
        // Восстанавливаем кнопку отправки
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Создать пользователя';
        }
    }
}

async function handleAddGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const groupData = {
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        year: formData.get('year'),
        description: formData.get('description')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(groupData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно создана', 'success');
                closeModal('addGroupModal');
                event.target.reset();
                await loadGroupsData();
            } else {
                showNotification(data.message || 'Ошибка создания группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка создания группы', 'error');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showNotification('Ошибка создания группы', 'error');
    } finally {
        showLoading(false);
    }
}

// User management functions
async function editUser(userId) {
    try {
        showLoading(true);
        
        // Load user data
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const user = data.user;
                
                // Populate form
                document.getElementById('editUserId').value = user.id;
                document.getElementById('editUserFullName').value = user.full_name || '';
                document.getElementById('editUserEmail').value = user.email || '';
                document.getElementById('editUserRole').value = user.role || '';
                document.getElementById('editUserSpecialty').value = user.specialty || '';
                document.getElementById('editUserGroup').value = user.group_name || '';
                document.getElementById('editUserActive').checked = user.is_active || false;
                
                // Load groups for dropdown
                await loadGroupsForEditForm();
                
                // Setup role-based fields
                setTimeout(() => {
                    setupEditRoleBasedFields();
                }, 300);
                
                showModal('editUserModal');
            } else {
                showNotification('Ошибка загрузки данных пользователя', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных пользователя', 'error');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Ошибка загрузки данных пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Пользователь успешно удален', 'success');
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка удаления пользователя', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления пользователя', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Ошибка удаления пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

// Group management functions
async function editGroup(groupId) {
    try {
        showLoading(true);
        
        // Load group data
        const response = await fetch(`/api/admin/groups/${groupId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const group = data.group;
                
                // Populate form
                document.getElementById('editGroupId').value = group.id;
                document.getElementById('editGroupName').value = group.name || '';
                document.getElementById('editGroupSpecialty').value = group.specialty || '';
                document.getElementById('editGroupYear').value = group.year || '';
                document.getElementById('editGroupDescription').value = group.description || '';
                
                showModal('editGroupModal');
            } else {
                showNotification('Ошибка загрузки данных группы', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных группы', 'error');
        }
    } catch (error) {
        console.error('Error loading group data:', error);
        showNotification('Ошибка загрузки данных группы', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно удалена', 'success');
                await loadGroupsData();
            } else {
                showNotification(data.message || 'Ошибка удаления группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления группы', 'error');
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        showNotification('Ошибка удаления группы', 'error');
    } finally {
        showLoading(false);
    }
}

// Attendance management functions
async function editAttendance(attendanceId) {
    try {
        showLoading(true);
        
        // Load attendance data
        const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const attendance = data.attendance;
                
                // Populate form
                document.getElementById('editAttendanceId').value = attendance.id;
                document.getElementById('editAttendanceStudent').value = attendance.student_name || '';
                document.getElementById('editAttendanceGroup').value = attendance.group_name || '';
                document.getElementById('editAttendanceSubject').value = attendance.subject_name || '';
                document.getElementById('editAttendanceDate').value = attendance.date || '';
                document.getElementById('editAttendanceStatus').value = attendance.status || '';
                document.getElementById('editAttendanceNotes').value = attendance.notes || '';
                
                showModal('editAttendanceModal');
            } else {
                showNotification('Ошибка загрузки данных посещаемости', 'error');
            }
        } else {
            showNotification('Ошибка загрузки данных посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteAttendance(attendanceId) {
    if (!confirm('Вы уверены, что хотите удалить эту запись посещаемости?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Запись посещаемости успешно удалена', 'success');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка удаления записи', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка удаления записи', 'error');
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showNotification('Ошибка удаления записи', 'error');
    } finally {
        showLoading(false);
    }
}

// Report functions
function generateReport(type) {
    // Set the report type and show modal
    document.getElementById('reportType').value = type;
    loadGroupsForReportForm();
    showModal('reportsModal');
}

// Export functions
function exportUsers() {
    showNotification('Функция экспорта пользователей будет добавлена позже', 'info');
}

// New modal functions
async function loadGroupsForAttendanceForm() {
    try {
        const response = await fetch('/api/admin/groups', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                populateGroupDropdown(data.groups, 'attendanceGroup');
            }
        }
    } catch (error) {
        console.error('Error loading groups for attendance:', error);
    }
}

function loadGroupsForReportForm() {
    // Load groups for report form
    loadGroupsForAttendanceForm().then(() => {
        const attendanceSelect = document.getElementById('attendanceGroup');
        const reportSelect = document.getElementById('reportGroup');
        if (attendanceSelect && reportSelect) {
            reportSelect.innerHTML = attendanceSelect.innerHTML;
        }
    });
}

async function loadSettingsData() {
    try {
        const response = await fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const settings = data.settings;
                
                // Populate settings form
                document.getElementById('settingCollegeName').value = settings.collegeName || 'Университетский Колледж ВолГУ';
                document.getElementById('settingAcademicYear').value = settings.academicYear || '2024-2025';
                document.getElementById('settingMaxStudents').value = settings.maxStudents || 30;
                document.getElementById('settingEmailNotifications').checked = settings.emailNotifications || true;
                document.getElementById('settingPushNotifications').checked = settings.pushNotifications || true;
                document.getElementById('settingAttendanceAlerts').checked = settings.attendanceAlerts || true;
                document.getElementById('settingSessionTimeout').value = settings.sessionTimeout || 60;
                document.getElementById('settingRequireStrongPasswords').checked = settings.requireStrongPasswords || true;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Setup role-based fields for edit user form
function setupEditRoleBasedFields() {
    const roleSelect = document.getElementById('editUserRole');
    const specialtyGroup = document.getElementById('editSpecialtyGroup');
    const groupGroup = document.getElementById('editGroupGroup');
    
    if (!roleSelect || !specialtyGroup || !groupGroup) {
        return;
    }
    
    // Add event listener for role changes
    roleSelect.addEventListener('change', function() {
        toggleEditFieldsBasedOnRole(this.value, specialtyGroup, groupGroup);
    });
    
    // Set initial state
    toggleEditFieldsBasedOnRole(roleSelect.value, specialtyGroup, groupGroup);
}

// Toggle fields based on selected role for edit form
function toggleEditFieldsBasedOnRole(role, specialtyGroup, groupGroup) {
    if (!specialtyGroup || !groupGroup) {
        return;
    }
    
    // Reset fields
    specialtyGroup.classList.remove('hidden');
    groupGroup.classList.remove('hidden');
    
    // Clear values when hiding
    const specialtySelect = document.getElementById('editUserSpecialty');
    const groupSelect = document.getElementById('editUserGroup');
    const specialtyLabel = specialtyGroup.querySelector('label');
    const groupLabel = groupGroup.querySelector('label');
    
    if (role === 'teacher') {
        // For teachers: hide group, show specialty
        groupGroup.classList.add('hidden');
        specialtyGroup.classList.remove('hidden');
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'admin') {
        // For admins: hide both group and specialty
        specialtyGroup.classList.add('hidden');
        groupGroup.classList.add('hidden');
        if (specialtySelect) specialtySelect.value = '';
        if (groupSelect) groupSelect.value = '';
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    } else if (role === 'student') {
        // For students: show both group and specialty
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность *';
        if (groupLabel) groupLabel.textContent = 'Группа *';
    } else {
        // Default: show both
        specialtyGroup.classList.remove('hidden');
        groupGroup.classList.remove('hidden');
        
        // Update labels
        if (specialtyLabel) specialtyLabel.textContent = 'Специальность';
        if (groupLabel) groupLabel.textContent = 'Группа';
    }
}

// Populate group dropdown helper
function populateGroupDropdown(groups, selectId) {
    const groupSelect = document.getElementById(selectId);
    if (!groupSelect) {
        console.warn('Group select element not found:', selectId);
        return;
    }
    
    console.log('Populating group dropdown for:', selectId, 'with groups:', groups);
    
    // Clear existing options except the first one
    groupSelect.innerHTML = '<option value="">Выберите группу</option>';
    
    if (groups && groups.length > 0) {
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.name;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });
        console.log('Added', groups.length, 'groups to dropdown');
    } else {
        // Add option if no groups available
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Группы не найдены';
        option.disabled = true;
        groupSelect.appendChild(option);
        console.log('No groups available, added disabled option');
    }
}

// Load students for attendance
async function loadStudentsForAttendance(groupName) {
    try {
        const response = await fetch(`/api/admin/groups/${groupName}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayStudentsForAttendance(data.students);
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Display students for attendance marking
function displayStudentsForAttendance(students) {
    const studentsList = document.getElementById('studentsList');
    if (!studentsList) return;
    
    studentsList.innerHTML = students.map(student => `
        <div class="student-attendance-item">
            <div class="student-info">
                <span class="student-name">${student.full_name || student.name}</span>
                <span class="student-id">ID: ${student.id}</span>
            </div>
            <div class="attendance-status">
                <select name="student_${student.id}_status" required>
                    <option value="">Выберите статус</option>
                    <option value="present">Присутствовал</option>
                    <option value="absent">Отсутствовал</option>
                    <option value="late">Опоздал</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Event listener for group change in attendance form
document.addEventListener('change', function(event) {
    if (event.target && event.target.id === 'attendanceGroup') {
        if (event.target.value) {
            loadStudentsForAttendance(event.target.value);
        } else {
            document.getElementById('studentsList').innerHTML = '';
        }
    }
});

// Form handlers for new modals
async function handleEditUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userId = formData.get('userId');
    const userData = {
        full_name: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        specialty: formData.get('specialty'),
        group_name: formData.get('group'),
        is_active: formData.get('isActive') === 'on'
    };
    
    // Remove empty password
    if (!userData.password) {
        delete userData.password;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Пользователь успешно обновлен', 'success');
                closeModal('editUserModal');
                await loadUsersData();
            } else {
                showNotification(data.message || 'Ошибка обновления пользователя', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления пользователя', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Ошибка обновления пользователя', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditGroup(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const groupId = formData.get('groupId');
    const groupData = {
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        year: formData.get('year'),
        description: formData.get('description')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/groups/${groupId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(groupData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Группа успешно обновлена', 'success');
                closeModal('editGroupModal');
                await loadGroupsData();
            } else {
                showNotification(data.message || 'Ошибка обновления группы', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления группы', 'error');
        }
    } catch (error) {
        console.error('Error updating group:', error);
        showNotification('Ошибка обновления группы', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAttendance(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const attendanceData = {
        group: formData.get('group'),
        subject: formData.get('subject'),
        date: formData.get('date'),
        time: formData.get('time'),
        students: []
    };
    
    // Collect student attendance data
    const studentSelects = document.querySelectorAll('[name^="student_"][name$="_status"]');
    studentSelects.forEach(select => {
        if (select.value) {
            const studentId = select.name.match(/student_(\d+)_status/)[1];
            attendanceData.students.push({
                student_id: studentId,
                status: select.value
            });
        }
    });
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Посещаемость успешно отмечена', 'success');
                closeModal('attendanceModal');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка отметки посещаемости', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка отметки посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showNotification('Ошибка отметки посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleEditAttendance(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const attendanceId = formData.get('attendanceId');
    const attendanceData = {
        date: formData.get('date'),
        status: formData.get('status'),
        notes: formData.get('notes')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/admin/attendance/${attendanceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Посещаемость успешно обновлена', 'success');
                closeModal('editAttendanceModal');
                await loadAttendanceData();
            } else {
                showNotification(data.message || 'Ошибка обновления посещаемости', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка обновления посещаемости', 'error');
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        showNotification('Ошибка обновления посещаемости', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleReports(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const reportData = {
        type: formData.get('type'),
        group: formData.get('group'),
        dateFrom: formData.get('dateFrom'),
        dateTo: formData.get('dateTo'),
        format: formData.get('format')
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Отчёт успешно создан', 'success');
                closeModal('reportsModal');
                
                // Download the report if URL provided
                if (data.reportUrl) {
                    window.open(data.reportUrl, '_blank');
                }
            } else {
                showNotification(data.message || 'Ошибка создания отчёта', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка создания отчёта', 'error');
        }
    } catch (error) {
        console.error('Error creating report:', error);
        showNotification('Ошибка создания отчёта', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSettings(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const settingsData = {
        collegeName: formData.get('collegeName'),
        academicYear: formData.get('academicYear'),
        maxStudents: parseInt(formData.get('maxStudents')),
        emailNotifications: formData.get('emailNotifications') === 'on',
        pushNotifications: formData.get('pushNotifications') === 'on',
        attendanceAlerts: formData.get('attendanceAlerts') === 'on',
        sessionTimeout: parseInt(formData.get('sessionTimeout')),
        requireStrongPasswords: formData.get('requireStrongPasswords') === 'on'
    };
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(settingsData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('Настройки успешно сохранены', 'success');
                closeModal('settingsModal');
            } else {
                showNotification(data.message || 'Ошибка сохранения настроек', 'error');
            }
        } else {
            const error = await response.json();
            showNotification(error.message || 'Ошибка сохранения настроек', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Ошибка сохранения настроек', 'error');
    } finally {
        showLoading(false);
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;
document.head.appendChild(style);

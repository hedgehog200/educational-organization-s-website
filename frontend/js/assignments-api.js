// API для работы с заданиями
class AssignmentsAPI {
    constructor() {
        this.baseURL = '/api/assignments';
    }

    // Получить все задания
    async getAssignments(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.subject) queryParams.append('subject', filters.subject);
            if (filters.status) queryParams.append('status', filters.status);

            const url = `${this.baseURL}?${queryParams.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка получения заданий:', error);
            throw error;
        }
    }

    // Получить задание по ID
    async getAssignmentById(assignmentId) {
        try {
            const response = await fetch(`${this.baseURL}/${assignmentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка получения задания:', error);
            throw error;
        }
    }

    // Создать новое задание (только для преподавателей)
    async createAssignment(assignmentData) {
        try {
            const formData = new FormData();
            formData.append('title', assignmentData.title);
            formData.append('description', assignmentData.description);
            formData.append('subject', assignmentData.subject);
            formData.append('deadline', assignmentData.deadline);
            formData.append('max_points', assignmentData.max_points);
            formData.append('is_published', assignmentData.is_published ? '1' : '0');
            
            if (assignmentData.file) {
                formData.append('file', assignmentData.file);
            }

            // Получаем CSRF токен
            const csrfToken = await getCsrfToken();
            const headers = {};
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка создания задания:', error);
            throw error;
        }
    }

    // Обновить задание (только для преподавателей)
    async updateAssignment(assignmentId, updateData) {
        try {
            // Получаем CSRF токен
            const csrfToken = await getCsrfToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${this.baseURL}/${assignmentId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка обновления задания:', error);
            throw error;
        }
    }

    // Публикация/скрытие задания (только для преподавателей)
    async publishAssignment(assignmentId, isPublished) {
        try {
            // Получаем CSRF токен
            const csrfToken = await getCsrfToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${this.baseURL}/${assignmentId}/publish`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ is_published: isPublished }),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка публикации задания:', error);
            throw error;
        }
    }

    // Удалить задание (только для преподавателей)
    async deleteAssignment(assignmentId) {
        try {
            // Получаем CSRF токен
            const csrfToken = await getCsrfToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(`${this.baseURL}/${assignmentId}`, {
                method: 'DELETE',
                headers: headers,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка удаления задания:', error);
            throw error;
        }
    }

    // Скачать файл задания
    async downloadAssignment(assignmentId) {
        try {
            const response = await fetch(`${this.baseURL}/${assignmentId}/download`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Получаем имя файла из заголовка Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'assignment';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Создаем blob и скачиваем файл
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Ошибка скачивания задания:', error);
            throw error;
        }
    }

    // Получить статистику заданий
    async getAssignmentsStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats/overview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ошибка получения статистики заданий:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
window.assignmentsAPI = new AssignmentsAPI();

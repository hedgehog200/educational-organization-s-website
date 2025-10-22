document.addEventListener('DOMContentLoaded', function() {
    // Notification dropdown
    const notificationIcon = document.querySelector('.notifications i');
    const notificationDropdown = document.querySelector('.notifications-dropdown');
    
    notificationIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationDropdown.classList.toggle('show');
    });
    
    // User dropdown
    const userInfo = document.querySelector('.user-info');
    const userDropdown = document.querySelector('.user-dropdown');
    
    userInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    
    // Close dropdowns when clicking elsewhere
    document.addEventListener('click', function() {
        notificationDropdown.classList.remove('show');
        userDropdown.classList.remove('show');
    });
    
    // Material upload functionality
    const uploadBtn = document.getElementById('uploadMaterialBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeModal = document.querySelector('.close-modal');
    const cancelBtn = document.querySelector('.cancel-btn');
    const uploadForm = document.getElementById('uploadMaterialForm');
    
    // Open modal
    uploadBtn.addEventListener('click', function() {
        uploadModal.style.display = 'block';
    });
    
    // Close modal
    function closeUploadModal() {
        uploadModal.style.display = 'none';
        uploadForm.reset();
    }
    
    closeModal.addEventListener('click', closeUploadModal);
    cancelBtn.addEventListener('click', closeUploadModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === uploadModal) {
            closeUploadModal();
        }
    });
    
    // Handle form submission
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Create FormData object
        const formData = new FormData(uploadForm);
        
        // In a real application, you would send this data to the server
        // For demonstration, we'll simulate a successful upload
        
        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Загрузка...';
        submitBtn.disabled = true;
        
        // Simulate server request
        setTimeout(function() {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Show success message
            alert('Материал успешно загружен!');
            
            // Close modal and reset form
            closeUploadModal();
            
            // In a real application, you would refresh the materials list or add the new material to the DOM
            addNewMaterialToDOM(formData);
        }, 1500);
    });
    
    // Function to add new material to DOM (for demonstration)
    function addNewMaterialToDOM(formData) {
        const title = formData.get('materialTitle');
        const subject = formData.get('materialSubject');
        const type = formData.get('materialType');
        const description = formData.get('materialDescription');
        const file = formData.get('materialFile');
        
        // Get the appropriate category section
        let categorySection;
        switch(subject) {
            case 'programming':
                categorySection = document.querySelector('.material-category:nth-of-type(1) .materials-grid');
                break;
            case 'databases':
                categorySection = document.querySelector('.material-category:nth-of-type(2) .materials-grid');
                break;
            case 'infosec':
                categorySection = document.querySelector('.material-category:nth-of-type(3) .materials-grid');
                break;
            default:
                // If category doesn't exist, use the first one
                categorySection = document.querySelector('.material-category:nth-of-type(1) .materials-grid');
        }
        
        // Get icon based on file type
        let fileIcon = 'fas fa-file';
        if (file.name.endsWith('.pdf')) {
            fileIcon = 'fas fa-file-pdf';
        } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
            fileIcon = 'fas fa-file-word';
        } else if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
            fileIcon = 'fas fa-file-powerpoint';
        } else if (file.name.endsWith('.mp4') || file.name.endsWith('.avi')) {
            fileIcon = 'fas fa-file-video';
        }
        
        // Create new material card
        const materialCard = document.createElement('div');
        materialCard.className = 'material-card new';
        materialCard.innerHTML = `
            <div class="material-icon"><i class="${fileIcon}"></i></div>
            <div class="material-info">
                <h4>${title}</h4>
                <p class="material-details">
                    <span class="material-type">${getTypeLabel(type)}</span>
                    <span class="material-date">Добавлено: ${getCurrentDate()}</span>
                    <span class="material-size">${getFileExtension(file.name)}, ${formatFileSize(file.size)}</span>
                </p>
                <div class="material-description">
                    ${description}
                </div>
            </div>
            <div class="material-actions">
                <button class="view-btn"><i class="fas fa-eye"></i></button>
                <button class="download-btn"><i class="fas fa-download"></i></button>
                <button class="favorite-btn"><i class="far fa-star"></i></button>
            </div>
        `;
        
        // Add to the DOM
        categorySection.prepend(materialCard);
    }
    
    // Helper functions
    function getCurrentDate() {
        const now = new Date();
        return `${now.getDate()} ${getMonthName(now.getMonth())} ${now.getFullYear()}`;
    }
    
    function getMonthName(month) {
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        return months[month];
    }
    
    function getTypeLabel(type) {
        const types = {
            'lecture': 'Лекция',
            'lab': 'Лабораторная работа',
            'practice': 'Практическое задание',
            'book': 'Учебник',
            'video': 'Видеоматериал',
            'presentation': 'Презентация'
        };
        return types[type] || 'Материал';
    }
    
    function getFileExtension(filename) {
        return filename.split('.').pop().toUpperCase();
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // Material filtering functionality
    const searchInput = document.getElementById('searchMaterials');
    const subjectFilter = document.getElementById('subjectFilter');
    const typeFilter = document.getElementById('typeFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    // Add event listeners for filters
    searchInput.addEventListener('input', filterMaterials);
    subjectFilter.addEventListener('change', filterMaterials);
    typeFilter.addEventListener('change', filterMaterials);
    semesterFilter.addEventListener('change', filterMaterials);
    
    function filterMaterials() {
        // Implement filtering logic here
    }
});
// Add this to your existing JavaScript file, after the form submission handler

// Drag and drop functionality
const dropArea = document.createElement('div');
dropArea.className = 'drop-area';
dropArea.innerHTML = '<p>Перетащите файл сюда или нажмите для выбора</p>';

const fileInput = document.getElementById('materialFile');
const fileInputParent = fileInput.parentElement;

// Insert drop area before the file input
fileInputParent.insertBefore(dropArea, fileInput);

// Hide the original file input
fileInput.style.display = 'none';

// Create file preview element
const filePreview = document.createElement('div');
filePreview.className = 'file-preview';
filePreview.style.display = 'none';
filePreview.innerHTML = `
    <i class="fas fa-file"></i>
    <span class="file-name"></span>
    <i class="fas fa-times remove-file"></i>
`;
fileInputParent.insertBefore(filePreview, fileInput.nextSibling);

// Click on drop area to trigger file input
dropArea.addEventListener('click', () => {
    fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        showFilePreview(file);
    }
}

// Show file preview
function showFilePreview(file) {
    // Update icon based on file type
    const iconElement = filePreview.querySelector('i:first-child');
    if (file.name.endsWith('.pdf')) {
        iconElement.className = 'fas fa-file-pdf';
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        iconElement.className = 'fas fa-file-word';
    } else if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
        iconElement.className = 'fas fa-file-powerpoint';
    } else if (file.name.endsWith('.mp4') || file.name.endsWith('.avi')) {
        iconElement.className = 'fas fa-file-video';
    } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
        iconElement.className = 'fas fa-file-archive';
    } else {
        iconElement.className = 'fas fa-file';
    }
    
    // Update file name
    filePreview.querySelector('.file-name').textContent = file.name;
    
    // Show preview
    filePreview.style.display = 'flex';
}

// Remove file
filePreview.querySelector('.remove-file').addEventListener('click', () => {
    fileInput.value = '';
    filePreview.style.display = 'none';
});

// Drag and drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('highlight');
}

function unhighlight() {
    dropArea.classList.remove('highlight');
}

// Handle drop
dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    
    fileInput.files = dt.files;
    if (file) {
        showFilePreview(file);
    }
}

// Add tooltips to action buttons
document.querySelectorAll('.material-actions button').forEach(button => {
    if (button.classList.contains('view-btn')) {
        button.setAttribute('data-tooltip', 'Просмотреть');
    } else if (button.classList.contains('download-btn')) {
        button.setAttribute('data-tooltip', 'Скачать');
    } else if (button.classList.contains('favorite-btn')) {
        button.setAttribute('data-tooltip', 'В избранное');
    }
});

// Add progress bar for upload simulation
const formActions = document.querySelector('.form-actions');
const progressContainer = document.createElement('div');
progressContainer.className = 'progress-container';
progressContainer.innerHTML = '<div class="progress-bar"></div>';
formActions.parentNode.insertBefore(progressContainer, formActions);

// Enhance form submission with progress bar
uploadForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Create FormData object
    const formData = new FormData(uploadForm);
    
    // Show loading state
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Загрузка...';
    submitBtn.disabled = true;
    
    // Show and animate progress bar
    progressContainer.style.display = 'block';
    const progressBar = progressContainer.querySelector('.progress-bar');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // Simulate server response delay
            setTimeout(() => {
                // Reset button and hide progress
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                progressContainer.style.display = 'none';
                
                // Show success message
                alert('Материал успешно загружен!');
                
                // Close modal and reset form
                closeUploadModal();
                
                // Add the new material to the DOM
                addNewMaterialToDOM(formData);
            }, 500);
        }
    }, 50);
});
// Modify the addNewMaterialToDOM function to properly display the uploaded material

function addNewMaterialToDOM(formData) {
    const title = formData.get('materialTitle');
    const subject = formData.get('materialSubject');
    const type = formData.get('materialType');
    const description = formData.get('materialDescription');
    const file = formData.get('materialFile');
    const semester = formData.get('materialSemester');
    
    // Find the appropriate category section based on subject
    let categorySection;
    let categoryExists = true;
    
    switch(subject) {
        case 'programming':
            categorySection = document.querySelector('.material-category h3 i.fas.fa-laptop-code').closest('.material-category');
            break;
        case 'databases':
            categorySection = document.querySelector('.material-category h3 i.fas.fa-database').closest('.material-category');
            break;
        case 'infosec':
            categorySection = document.querySelector('.material-category h3 i.fas.fa-shield-alt').closest('.material-category');
            break;
        case 'math':
            // Check if math category exists
            const mathCategory = document.querySelector('.material-category h3 i.fas.fa-calculator');
            if (mathCategory) {
                categorySection = mathCategory.closest('.material-category');
            } else {
                categoryExists = false;
            }
            break;
        case 'networks':
            // Check if networks category exists
            const networksCategory = document.querySelector('.material-category h3 i.fas.fa-network-wired');
            if (networksCategory) {
                categorySection = networksCategory.closest('.material-category');
            } else {
                categoryExists = false;
            }
            break;
        default:
            // If category doesn't exist, use the first one
            categorySection = document.querySelector('.material-category');
            break;
    }
    
    // If category doesn't exist, create it
    if (!categoryExists) {
        categorySection = createNewCategory(subject);
    }
    
    // Get the materials grid inside the category
    const materialsGrid = categorySection.querySelector('.materials-grid');
    
    // Get icon based on file type
    let fileIcon = 'fas fa-file';
    if (file.name.endsWith('.pdf')) {
        fileIcon = 'fas fa-file-pdf';
    } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        fileIcon = 'fas fa-file-word';
    } else if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
        fileIcon = 'fas fa-file-powerpoint';
    } else if (file.name.endsWith('.mp4') || file.name.endsWith('.avi') || file.name.endsWith('.mov')) {
        fileIcon = 'fas fa-file-video';
    } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
        fileIcon = 'fas fa-file-archive';
    } else if (file.name.endsWith('.jpg') || file.name.endsWith('.png') || file.name.endsWith('.gif')) {
        fileIcon = 'fas fa-file-image';
    }
    
    // Create new material card
    const materialCard = document.createElement('div');
    materialCard.className = 'material-card new';
    materialCard.innerHTML = `
        <div class="material-icon"><i class="${fileIcon}"></i></div>
        <div class="material-info">
            <h4>${title}</h4>
            <p class="material-details">
                <span class="material-type">${getTypeLabel(type)}</span>
                <span class="material-date">Добавлено: ${getCurrentDate()}</span>
                <span class="material-size">${getFileExtension(file.name)}, ${formatFileSize(file.size)}</span>
            </p>
            <div class="material-description">
                ${description}
            </div>
        </div>
        <div class="material-actions">
            <button class="view-btn" data-tooltip="Просмотреть"><i class="fas fa-eye"></i></button>
            <button class="download-btn" data-tooltip="Скачать"><i class="fas fa-download"></i></button>
            <button class="favorite-btn" data-tooltip="В избранное"><i class="far fa-star"></i></button>
        </div>
    `;
    
    // Add to the DOM at the beginning of the materials grid
    materialsGrid.insertBefore(materialCard, materialsGrid.firstChild);
    
    // Scroll to the new material
    materialCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add highlight effect
    materialCard.style.backgroundColor = '#e8f5e9';
    setTimeout(() => {
        materialCard.style.transition = 'background-color 1s ease';
        materialCard.style.backgroundColor = '';
    }, 100);
    
    // Add event listeners to the new buttons
    addButtonEventListeners(materialCard);
}

// Function to create a new category if it doesn't exist
function createNewCategory(subject) {
    const main = document.querySelector('main');
    const lastCategory = document.querySelector('.material-category:last-child');
    
    // Create new category element
    const newCategory = document.createElement('div');
    newCategory.className = 'material-category';
    
    // Set the appropriate icon and title based on subject
    let icon, title;
    switch(subject) {
        case 'math':
            icon = 'fas fa-calculator';
            title = 'Математика';
            break;
        case 'networks':
            icon = 'fas fa-network-wired';
            title = 'Компьютерные сети';
            break;
        default:
            icon = 'fas fa-book';
            title = 'Другие материалы';
    }
    
    newCategory.innerHTML = `
        <h3><i class="${icon}"></i> ${title}</h3>
        <div class="materials-grid"></div>
        <a href="#" class="view-all-link">Все материалы по ${title.toLowerCase()} <i class="fas fa-arrow-right"></i></a>
    `;
    
    // Insert after the last category
    if (lastCategory) {
        lastCategory.after(newCategory);
    } else {
        main.appendChild(newCategory);
    }
    
    return newCategory;
}

// Add event listeners to material card buttons
function addButtonEventListeners(card) {
    // View button
    card.querySelector('.view-btn').addEventListener('click', function() {
        const title = card.querySelector('h4').textContent;
        alert(`Просмотр материала: ${title}`);
        // In a real application, you would open the file or redirect to a viewer page
    });
    
    // Download button
    card.querySelector('.download-btn').addEventListener('click', function() {
        const title = card.querySelector('h4').textContent;
        alert(`Скачивание материала: ${title}`);
        // In a real application, you would trigger a download
    });
    
    // Favorite button
    card.querySelector('.favorite-btn').addEventListener('click', function() {
        const starIcon = this.querySelector('i');
        if (starIcon.classList.contains('far')) {
            starIcon.classList.remove('far');
            starIcon.classList.add('fas');
            starIcon.style.color = '#FFD700';
        } else {
            starIcon.classList.remove('fas');
            starIcon.classList.add('far');
            starIcon.style.color = '';
        }
    });
}

// Add event listeners to existing material cards
document.querySelectorAll('.material-card').forEach(card => {
    addButtonEventListeners(card);
});
// Add this function to handle file preview when clicking the view button

function previewMaterial(fileType, fileName) {
    // Create modal for preview
    const previewModal = document.createElement('div');
    previewModal.className = 'modal preview-modal';
    previewModal.style.display = 'block';
    
    let previewContent;
    
    // Different preview based on file type
    if (fileType === 'pdf') {
        previewContent = `
            <iframe src="path/to/files/${fileName}" width="100%" height="500px"></iframe>
        `;
    } else if (fileType === 'video') {
        previewContent = `
            <video controls width="100%">
                <source src="path/to/files/${fileName}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else if (fileType === 'image') {
        previewContent = `
            <img src="path/to/files/${fileName}" style="max-width: 100%; max-height: 80vh;">
        `;
    } else {
        // For other file types that can't be previewed directly
        previewContent = `
            <div class="no-preview">
                <i class="fas fa-file fa-5x"></i>
                <p>Предпросмотр для данного типа файлов недоступен</p>
                <button class="download-preview-btn">Скачать файл</button>
            </div>
        `;
    }
    
    previewModal.innerHTML = `
        <div class="modal-content preview-content">
            <span class="close-modal">&times;</span>
            <h3>${fileName}</h3>
            <div class="preview-container">
                ${previewContent}
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(previewModal);
    
    // Close button functionality
    previewModal.querySelector('.close-modal').addEventListener('click', () => {
        previewModal.remove();
    });
    
    // Close when clicking outside
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.remove();
        }
    });
    
    // Download button in preview (if exists)
    const downloadBtn = previewModal.querySelector('.download-preview-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            alert(`Скачивание файла: ${fileName}`);
            // In a real application, trigger actual download
        });
    }
}
// Update the view button event listener in the addButtonEventListeners function

function addButtonEventListeners(card) {
    // View button
    card.querySelector('.view-btn').addEventListener('click', function() {
        const title = card.querySelector('h4').textContent;
        const fileTypeSpan = card.querySelector('.material-size');
        const fileType = fileTypeSpan ? fileTypeSpan.textContent.split(',')[0].toLowerCase() : '';
        
        // Determine file type for preview
        let previewType;
        if (fileType.includes('pdf')) {
            previewType = 'pdf';
        } else if (fileType.includes('mp4') || fileType.includes('avi') || fileType.includes('mov')) {
            previewType = 'video';
        } else if (fileType.includes('jpg') || fileType.includes('png') || fileType.includes('gif')) {
            previewType = 'image';
        } else {
            previewType = 'other';
        }
        
        // Call preview function
        previewMaterial(previewType, title + '.' + fileType.toLowerCase());
    });
    
    // Rest of the function remains the same...
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the assignments page
    if (!document.querySelector('.assignments-container')) {
        return; // Exit if not on the assignments page
    }
    
    // Get the modal
    const modal = document.getElementById('assignmentModal');
    if (!modal) {
        return; // Exit if modal doesn't exist
    }
    
    // Get the <span> element that closes the modal
    const closeBtn = modal.querySelector('.close-modal');
    
    // Set up event listeners for assignment cards
    const assignmentCards = document.querySelectorAll('.assignment-card');
    
    assignmentCards.forEach(card => {
        card.addEventListener('click', function() {
            // Get assignment details from the card
            const title = this.querySelector('h3').textContent;
            const subject = this.querySelector('p').textContent;
            const deadline = this.querySelector('.deadline').textContent;
            
            // Set the assignment ID (you would need to add this as a data attribute to your cards)
            const assignmentId = this.getAttribute('data-assignment-id');
            
            // Populate the modal with assignment details
            document.getElementById('assignment-title').textContent = title;
            document.getElementById('assignment-subject').textContent = subject;
            document.getElementById('assignment-deadline').textContent = deadline;
            document.getElementById('assignment_id').value = assignmentId;
            
            // Show the modal
            modal.style.display = 'block';
        });
    });
    
    // Close the modal when the user clicks on <span> (x)
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close the modal when the user clicks anywhere outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle form submission
    const form = document.getElementById('assignmentSubmissionForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Create FormData object
        const formData = new FormData(this);
        
        // Check if file is selected
        const fileInput = document.getElementById('assignment_file');
        if (fileInput.files.length === 0) {
            alert('Пожалуйста, выберите файл для отправки');
            return;
        }
        
        // Check file size (5MB max)
        if (fileInput.files[0].size > 5000000) {
            alert('Файл слишком большой. Максимальный размер 5MB');
            return;
        }
        
        // Check file type
        const fileName = fileInput.files[0].name;
        const fileExt = fileName.split('.').pop().toLowerCase();
        const allowedTypes = ['pdf', 'doc', 'docx', 'zip', 'rar'];
        
        if (!allowedTypes.includes(fileExt)) {
            alert('Недопустимый формат файла. Разрешены только PDF, DOC, DOCX, ZIP, RAR');
            return;
        }
        
        // Show loading indicator
        const submitBtn = form.querySelector('.submit-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;
        
        // Send form data to server
        fetch('php/submit_assignment.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                alert(data.message);
                
                // Update UI to reflect submission
                const assignmentId = document.getElementById('assignment_id').value;
                const card = document.querySelector(`.assignment-card[data-assignment-id="${assignmentId}"]`);
                
                if (card) {
                    // Update progress bar to 100%
                    const progressBar = card.querySelector('.progress');
                    progressBar.style.width = '100%';
                    
                    // Update progress text
                    const progressText = card.querySelector('.progress-text');
                    progressText.textContent = 'Выполнено: 100%';
                    
                    // Update status
                    const statusElement = card.querySelector('.assignment-status');
                    statusElement.textContent = 'Отправлено';
                    statusElement.className = 'assignment-status submitted';
                }
                
                // Close the modal
                modal.style.display = 'none';
            } else {
                // Show error message
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Произошла ошибка при отправке задания');
        })
        .finally(() => {
            // Reset button state
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        });
    });
    
    // Set up support chat button
    const supportBtn = document.querySelector('.support-btn');
    const supportModal = document.getElementById('supportModal');
    const supportCloseBtn = supportModal.querySelector('.close-modal');
    
    supportBtn.addEventListener('click', function() {
        supportModal.style.display = 'block';
    });
    
    supportCloseBtn.addEventListener('click', function() {
        supportModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === supportModal) {
            supportModal.style.display = 'none';
        }
    });
    
    // Handle file input styling
    const fileInput = document.getElementById('assignment_file');
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            const fileSize = (this.files[0].size / 1024).toFixed(2) + ' KB';
            const fileInfo = document.querySelector('.file-info');
            fileInfo.textContent = `Выбран файл: ${fileName} (${fileSize})`;
        }
    });
});
/**
 * Assignment Submission JavaScript
 * Handles functionality for viewing, submitting, and managing assignments
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const assignmentItems = document.querySelectorAll('.assignment-item');
    const viewButtons = document.querySelectorAll('.btn-view');
    const submitButtons = document.querySelectorAll('.btn-submit');
    const feedbackButtons = document.querySelectorAll('.btn-feedback');
    const closeModalButtons = document.querySelectorAll('.close-modal, .btn-close-modal');
    
    // Modals
    const viewAssignmentModal = document.getElementById('viewAssignmentModal');
    const assignmentModal = document.getElementById('assignmentModal');
    const feedbackModal = document.getElementById('feedbackModal');
    
    // Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Initialize the "All" tab with combined assignments
    initializeAllTab();
    
    // Event Listeners
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });
    
    // View assignment details
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const assignmentItem = this.closest('.assignment-item');
            const assignmentId = assignmentItem.getAttribute('data-id');
            
            // Populate modal with assignment details
            populateAssignmentViewModal(assignmentItem);
            
            // Show modal
            viewAssignmentModal.style.display = 'block';
        });
    });
    
    // Submit assignment
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            const assignmentId = this.getAttribute('data-assignment-id');
            const assignmentItem = this.closest('.assignment-item');
            
            // Populate submission modal
            populateSubmissionModal(assignmentItem, assignmentId);
            
            // Show modal
            assignmentModal.style.display = 'block';
        });
    });
    
    // View feedback
    feedbackButtons.forEach(button => {
        button.addEventListener('click', function() {
            const assignmentItem = this.closest('.assignment-item');
            
            // Populate feedback modal
            populateFeedbackModal(assignmentItem);
            
            // Show modal
            feedbackModal.style.display = 'block';
        });
    });
    
    // Close modals
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // File upload handling
    if (document.getElementById('file-upload-input')) {
        const fileUploadInput = document.getElementById('file-upload-input');
        const fileUploadArea = document.querySelector('.file-upload');
        const uploadedFilesContainer = document.querySelector('.uploaded-files');
        
        fileUploadArea.addEventListener('click', function() {
            fileUploadInput.click();
        });
        
        fileUploadInput.addEventListener('change', function() {
            handleFileUpload(this.files);
        });
        
        // Drag and drop functionality
        fileUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            handleFileUpload(e.dataTransfer.files);
        });
        
        // Handle file upload
        function handleFileUpload(files) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileSize = formatFileSize(file.size);
                const fileExtension = file.name.split('.').pop().toLowerCase();
                let fileIcon;
                
                // Determine file icon based on extension
                switch (fileExtension) {
                    case 'pdf':
                        fileIcon = 'fa-file-pdf';
                        break;
                    case 'doc':
                    case 'docx':
                        fileIcon = 'fa-file-word';
                        break;
                    case 'xls':
                    case 'xlsx':
                        fileIcon = 'fa-file-excel';
                        break;
                    case 'ppt':
                    case 'pptx':
                        fileIcon = 'fa-file-powerpoint';
                        break;
                    case 'jpg':
                    case 'jpeg':
                    case 'png':
                    case 'gif':
                        fileIcon = 'fa-file-image';
                        break;
                    case 'zip':
                    case 'rar':
                        fileIcon = 'fa-file-archive';
                        break;
                    default:
                        fileIcon = 'fa-file';
                }
                
                // Create file element
                const fileElement = document.createElement('div');
                fileElement.className = 'uploaded-file';
                fileElement.innerHTML = `
                    <i class="fas ${fileIcon}"></i>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <div class="file-actions">
                        <button type="button" class="btn-remove-file"><i class="fas fa-times"></i></button>
                    </div>
                `;
                
                uploadedFilesContainer.appendChild(fileElement);
                
                // Add remove event listener
                fileElement.querySelector('.btn-remove-file').addEventListener('click', function() {
                    fileElement.remove();
                });
            }
            
            // Clear input
            fileUploadInput.value = '';
        }
        
        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    }
    
    // Functions
    
    // Initialize the "All" tab with combined assignments
    function initializeAllTab() {
        const allTabContent = document.getElementById('all-tab');
        if (!allTabContent) {
            return; // Exit if all-tab doesn't exist
        }
        
        const assignmentsList = allTabContent.querySelector('.assignments-list');
        if (!assignmentsList) {
            return; // Exit if assignments-list doesn't exist
        }
        
        // Clone active assignments
        const activeAssignments = document.querySelectorAll('#active-tab .assignment-item');
        activeAssignments.forEach(assignment => {
            const clone = assignment.cloneNode(true);
            assignmentsList.appendChild(clone);
        });
        
        // Clone completed assignments
        const completedAssignments = document.querySelectorAll('#completed-tab .assignment-item');
        completedAssignments.forEach(assignment => {
            const clone = assignment.cloneNode(true);
            assignmentsList.appendChild(clone);
        });
        
        // Re-attach event listeners to cloned elements
        const allViewButtons = assignmentsList.querySelectorAll('.btn-view');
        allViewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const assignmentItem = this.closest('.assignment-item');
                populateAssignmentViewModal(assignmentItem);
                viewAssignmentModal.style.display = 'block';
            });
        });
        
        const allSubmitButtons = assignmentsList.querySelectorAll('.btn-submit');
        allSubmitButtons.forEach(button => {
            button.addEventListener('click', function() {
                const assignmentId = this.getAttribute('data-assignment-id');
                const assignmentItem = this.closest('.assignment-item');
                populateSubmissionModal(assignmentItem, assignmentId);
                assignmentModal.style.display = 'block';
            });
        });
        
        const allFeedbackButtons = assignmentsList.querySelectorAll('.btn-feedback');
        allFeedbackButtons.forEach(button => {
            button.addEventListener('click', function() {
                const assignmentItem = this.closest('.assignment-item');
                populateFeedbackModal(assignmentItem);
                feedbackModal.style.display = 'block';
            });
        });
    }
    
    // Populate assignment view modal
    function populateAssignmentViewModal(assignmentItem) {
        const title = assignmentItem.querySelector('h3').textContent;
        const subject = assignmentItem.querySelector('.assignment-subject').textContent.trim();
        const deadline = assignmentItem.querySelector('.assignment-deadline').textContent.trim();
        const description = assignmentItem.querySelector('.assignment-description p').textContent;
        
        document.getElementById('view-assignment-title').textContent = title;
        document.getElementById('view-subject').textContent = subject.replace('Предмет: ', '');
        document.getElementById('view-deadline').textContent = deadline.replace('Срок сдачи: ', '');
        
        // For a real application, you would fetch detailed description from the server
        // This is just a placeholder
        if (title.includes('Лабораторная работа №5')) {
            // Keep the detailed description that's already in the HTML
        } else {
            document.getElementById('view-description').innerHTML = `<p>${description}</p>`;
        }
    }
    
    // Populate submission modal
    function populateSubmissionModal(assignmentItem, assignmentId) {
        const title = assignmentItem.querySelector('h3').textContent;
        const subject = assignmentItem.querySelector('.assignment-subject').textContent.trim();
        const deadline = assignmentItem.querySelector('.assignment-deadline').textContent.trim();
        
        document.getElementById('assignment-title').textContent = title;
        document.getElementById('assignment-subject').textContent = subject;
        document.getElementById('assignment-deadline').textContent = deadline;
        document.getElementById('assignment_id').value = assignmentId;
        
        // Clear any previously uploaded files
        if (document.querySelector('.uploaded-files')) {
            document.querySelector('.uploaded-files').innerHTML = '';
        }
    }
    
    // Populate feedback modal
    function populateFeedbackModal(assignmentItem) {
        const title = assignmentItem.querySelector('h3').textContent;
        const subject = assignmentItem.querySelector('.assignment-subject').textContent.trim();
        const grade = assignmentItem.querySelector('.assignment-grade').textContent.trim();
        
        document.getElementById('feedback-assignment-title').textContent = title;
        document.getElementById('feedback-subject').textContent = subject.replace('Предмет: ', '');
        
        // For a real application, you would fetch feedback data from the server
        // This is just a placeholder that uses the existing content in the modal
    }
});

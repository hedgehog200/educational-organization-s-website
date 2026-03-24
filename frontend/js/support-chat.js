document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    
    // Function to add a new message to the chat
    function addMessage(content, isUser = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user' : 'message support';
        
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
                <span class="message-time">${timeString}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // If this is a user message, simulate a response after a delay
        if (isUser) {
            setTimeout(() => {
                simulateResponse(content);
            }, 1000);
        }
    }
    
    // Function to simulate a support response
    function simulateResponse(userMessage) {
        let response;
        
        // Simple response logic based on keywords in the user's message
        const lowerCaseMessage = userMessage.toLowerCase();
        
        if (lowerCaseMessage.includes('пароль')) {
            response = 'Для сброса пароля перейдите в раздел "Настройки" и выберите опцию "Изменить пароль". Если у вас возникли проблемы, обратитесь к администратору.';
        } else if (lowerCaseMessage.includes('расписани')) {
            response = 'Актуальное расписание доступно в разделе "Расписание". Вы также можете скачать его в формате PDF.';
        } else if (lowerCaseMessage.includes('задани') || lowerCaseMessage.includes('работ')) {
            response = 'Все задания доступны в разделе "Задания". Для отправки выполненного задания нажмите на карточку задания и загрузите файл.';
        } else if (lowerCaseMessage.includes('оценк') || lowerCaseMessage.includes('балл')) {
            response = 'Ваши оценки и средний балл можно посмотреть в разделе "Успеваемость".';
        } else if (lowerCaseMessage.includes('спасибо')) {
            response = 'Всегда рады помочь! Если у вас возникнут еще вопросы, обращайтесь.';
        } else {
            response = 'Спасибо за ваше сообщение. Оно передано в техническую поддержку. Мы свяжемся с вами в ближайшее время.';
        }
        
        addMessage(response, false);
    }
    
    // Send message when the send button is clicked
    sendButton.addEventListener('click', function() {
        sendMessage();
    });
    
    // Send message when Enter key is pressed (but allow Shift+Enter for new lines)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    function sendMessage() {
        const message = messageInput.value.trim();
        
        if (message) {
            // Add the message to the chat
            addMessage(message);
            
            // Clear the input field
            messageInput.value = '';
            
            // In a real application, you would send the message to the server here
            // For example:
            /*
            fetch('php/support_chat.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message
                }),
            });
            */
        }
    }
});

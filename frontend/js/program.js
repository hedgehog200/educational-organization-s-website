// Функция для переключения спойлеров специальностей
function toggleSpecialty(id) {
  const content = document.getElementById(id);
  const icon = document.getElementById('icon-' + id);
  const allContents = document.querySelectorAll('.specialty-content');
  const allIcons = document.querySelectorAll('.toggle-icon');
  
  // Если контент уже открыт, закрываем его
  if (content.classList.contains('active')) {
    content.style.maxHeight = '0';
    content.classList.remove('active');
    icon.textContent = '+';
    icon.classList.remove('active');
  } else {
    // Закрываем все открытые спойлеры
    allContents.forEach(item => {
      item.style.maxHeight = '0';
      item.classList.remove('active');
    });
    
    allIcons.forEach(item => {
      item.textContent = '+';
      item.classList.remove('active');
    });
    
    // Открываем выбранный спойлер
    content.classList.add('active');
    content.style.maxHeight = content.scrollHeight + 'px';
    icon.textContent = '×';
    icon.classList.add('active');
    
    // Плавная прокрутка к открытому спойлеру
    setTimeout(() => {
      content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
  }
}

// Инициализация спойлеров при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  // Устанавливаем начальную высоту для всех спойлеров
  const contents = document.querySelectorAll('.specialty-content');
  contents.forEach(content => {
    content.style.maxHeight = '0';
  });
  
  // Добавляем кнопки "Подать заявку" в каждый спойлер
  const specialtyInners = document.querySelectorAll('.specialty-inner');
  specialtyInners.forEach(inner => {
    const applyButton = document.createElement('a');
    applyButton.href = '#contact-section';
    applyButton.className = 'apply-button';
    applyButton.textContent = 'Подать заявку';
    inner.appendChild(applyButton);
  });
  
  // Добавляем индикаторы популярности к некоторым специальностям
  const popularSpecialties = ['specialty5', 'specialty1', 'specialty4'];
  popularSpecialties.forEach(id => {
    const header = document.querySelector(`[onclick="toggleSpecialty('${id}')"] h3`);
    const badge = document.createElement('span');
    badge.className = 'popularity-badge';
    badge.textContent = 'Популярная';
    header.appendChild(badge);
  });
});

// Обработка изменения размера окна для корректного отображения открытых спойлеров
window.addEventListener('resize', function() {
  const activeContents = document.querySelectorAll('.specialty-content.active');
  activeContents.forEach(content => {
    content.style.maxHeight = content.scrollHeight + 'px';
  });
});

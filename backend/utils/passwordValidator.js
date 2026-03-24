/**
 * Утилита для валидации паролей
 * Проверяет на слабые/распространенные пароли
 */

// Список 100 самых популярных паролей (Top 100 from NCSC/Have I Been Pwned)
const COMMON_PASSWORDS = [
  '123456', 'password', '123456789', '12345678', '12345', '1234567', 
  'password1', '123123', '1234567890', '1234', 'qwerty123', 'qwerty', 
  '1q2w3e4r', 'qwerty1', '123321', 'password123', '1q2w3e4r5t', 
  '1234qwer', 'qwertyuiop', '123qwe', 'admin', 'Password', '12345678910',
  'abc123', 'letmein', 'monkey', '1234567891', 'welcome', 'login',
  'dragon', 'passw0rd', 'master', 'hello', 'freedom', 'whatever',
  'qazwsx', 'trustno1', '654321', 'jordan23', 'harley', 'password!',
  'aa123456', 'qwerty12', '1qaz2wsx', 'baseball', 'password1!',
  'football', 'master123', 'sunshine', 'ashley', 'bailey', 'shadow',
  'superman', 'michael', 'computer', 'iloveyou', '111111', 'zaq1zaq1',
  'gwerty123', '1g2w3e4r', 'gwerty', 'gwerty1', 'zaq12wsx', '1qaz2wsx3edc',
  'starwars', 'klaster', 'photoshop', 'abc123456', 'asdf1234',
  'asdfghjkl', 'andrea', 'solo', 'pass1234', 'test123', 'killer',
  'charlie', 'foobar', 'buster', 'summer', 'purple', 'maggie', 'ginger',
  'princess', 'joshua', 'cheese', 'amanda', 'love', 'qwerty!', 'password!@#',
  'Admin123', 'Admin@123', 'Root123', 'User123', 'test1234', 'demo123',
  'example', 'sample', 'welcome123', 'pass@123', 'pass123', 'temp123'
];

// Распространенные паттерны паролей
const WEAK_PATTERNS = [
  /^(.)\1+$/,                    // Один символ повторяется (111111, aaaaa)
  /^(?:abc|qwe|zxc|asd){3,}$/i,  // Клавиатурные паттерны
  /^[0-9]+$/,                     // Только цифры
  /^[a-z]+$/i,                    // Только буквы
  /^password/i,                   // Начинается с "password"
  /^admin/i,                      // Начинается с "admin"
  /^user/i,                       // Начинается с "user"
  /^test/i,                       // Начинается с "test"
  /^demo/i,                       // Начинается с "demo"
  /^guest/i,                      // Начинается с "guest"
  /^temp/i,                       // Начинается с "temp"
  /^\d{4,}$/,                     // Только цифры (4 или больше)
  /^[A-Za-z]{1,5}$/,              // Короткие только буквы
];

/**
 * Проверка пароля на слабость/распространенность
 * @param {string} password - Пароль для проверки
 * @returns {object} { isValid: boolean, reason: string|null }
 */
function validatePassword(password) {
  // 1. Проверка минимальной длины
  if (password.length < 8) {
    return {
      isValid: false,
      reason: 'Пароль должен содержать минимум 8 символов'
    };
  }

  // 2. Проверка максимальной длины (защита от DoS через bcrypt)
  if (password.length > 128) {
    return {
      isValid: false,
      reason: 'Пароль слишком длинный (максимум 128 символов)'
    };
  }

  // 3. Проверка на список популярных паролей (case-insensitive)
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword === common.toLowerCase())) {
    return {
      isValid: false,
      reason: 'Этот пароль слишком распространен и небезопасен. Выберите более сложный пароль.'
    };
  }

  // 4. Проверка на слабые паттерны
  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      return {
        isValid: false,
        reason: 'Пароль содержит слабый паттерн. Используйте комбинацию букв, цифр и символов.'
      };
    }
  }

  // 5. Проверка на наличие различных типов символов
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const typeCount = [hasLowercase, hasUppercase, hasDigit, hasSpecial].filter(Boolean).length;

  if (typeCount < 3) {
    return {
      isValid: false,
      reason: 'Пароль должен содержать хотя бы 3 из 4 типов символов: строчные буквы, заглавные буквы, цифры, специальные символы'
    };
  }

  // Все проверки пройдены
  return {
    isValid: true,
    reason: null
  };
}

/**
 * Оценка сложности пароля (0-100)
 * @param {string} password - Пароль для оценки
 * @returns {number} Оценка от 0 до 100
 */
function getPasswordStrength(password) {
  let strength = 0;

  // Длина (до 50 баллов)
  strength += Math.min(50, password.length * 2);

  // Разнообразие символов (до 40 баллов)
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;

  // Энтропия (до 10 баллов)
  const uniqueChars = new Set(password).size;
  strength += Math.min(10, uniqueChars);

  return Math.min(100, strength);
}

/**
 * Получить рекомендации по улучшению пароля
 * @param {string} password - Пароль для анализа
 * @returns {string[]} Массив рекомендаций
 */
function getPasswordSuggestions(password) {
  const suggestions = [];

  if (password.length < 12) {
    suggestions.push('Увеличьте длину пароля до 12+ символов для большей безопасности');
  }

  if (!/[a-z]/.test(password)) {
    suggestions.push('Добавьте строчные буквы (a-z)');
  }

  if (!/[A-Z]/.test(password)) {
    suggestions.push('Добавьте заглавные буквы (A-Z)');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('Добавьте цифры (0-9)');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    suggestions.push('Добавьте специальные символы (!@#$%^&*)');
  }

  if (/(.)\1{2,}/.test(password)) {
    suggestions.push('Избегайте повторяющихся символов (aaa, 111)');
  }

  return suggestions;
}

module.exports = {
  validatePassword,
  getPasswordStrength,
  getPasswordSuggestions
};


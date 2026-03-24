/**
 * Скрипт для сброса пароля администратора
 * Использование: node scripts/reset-admin-password.js [новый_пароль]
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const readline = require('readline');

// Путь к базе данных
const dbPath = path.join(__dirname, '../database/college.db');

// Создание интерфейса для ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для запроса пароля
function askForPassword() {
  return new Promise((resolve) => {
    // Если пароль передан как аргумент
    if (process.argv[2]) {
      resolve(process.argv[2]);
      return;
    }

    // Иначе спрашиваем
    rl.question('Введите новый пароль для администратора (мин. 8 символов): ', (password) => {
      if (password.length < 8) {
        console.log('\n❌ Пароль слишком короткий! Минимум 8 символов.\n');
        rl.close();
        process.exit(1);
      }
      resolve(password);
    });
  });
}

// Основная функция
async function resetAdminPassword() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔐 Сброс пароля администратора');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Получаем новый пароль
    const newPassword = await askForPassword();
    rl.close();

    // Подключаемся к базе данных
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
        process.exit(1);
      }
      console.log('✅ Подключение к базе данных успешно\n');
    });

    // Хешируем новый пароль
    console.log('🔄 Хеширование пароля...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль администратора
    const adminEmail = 'admin@college.ru';
    
    db.run(
      'UPDATE users SET password = ? WHERE email = ? AND role = ?',
      [hashedPassword, adminEmail, 'admin'],
      function(err) {
        if (err) {
          console.error('❌ Ошибка обновления пароля:', err.message);
          db.close();
          process.exit(1);
        }

        if (this.changes === 0) {
          console.log('⚠️  Администратор не найден в базе данных!');
          console.log('   Email: admin@college.ru');
          console.log('   Возможно, нужно создать администратора.\n');
          
          // Предлагаем создать администратора
          db.run(
            `INSERT INTO users (email, password, full_name, role, is_active, created_at)
             VALUES (?, ?, ?, 'admin', 1, datetime('now'))`,
            [adminEmail, hashedPassword, 'Администратор'],
            function(createErr) {
              if (createErr) {
                console.error('❌ Ошибка создания администратора:', createErr.message);
                db.close();
                process.exit(1);
              }

              console.log('\n═══════════════════════════════════════════════════════════════');
              console.log('✅ Администратор успешно создан!');
              console.log('═══════════════════════════════════════════════════════════════');
              console.log('Email:  ', adminEmail);
              console.log('Пароль: ', newPassword);
              console.log('═══════════════════════════════════════════════════════════════');
              console.log('\n⚠️  СОХРАНИТЕ этот пароль!\n');
              
              db.close();
              process.exit(0);
            }
          );
        } else {
          console.log('\n═══════════════════════════════════════════════════════════════');
          console.log('✅ Пароль администратора успешно сброшен!');
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('Email:  ', adminEmail);
          console.log('Пароль: ', newPassword);
          console.log('═══════════════════════════════════════════════════════════════');
          console.log('\n✅ Теперь вы можете войти с новым паролем!\n');
          
          db.close();
          process.exit(0);
        }
      }
    );

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск
resetAdminPassword();


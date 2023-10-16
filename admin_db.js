const { Client } = require("pg"); // Импортирование клиента PostgreSQL
const bcrypt = require("bcrypt"); // Импортирование библиотеки bcrypt для хеширования паролей
const saltRounds = 10; // Установка количества раундов для генерации хэша

// Функция для подключения к базе данных
function connectToDatabase() {
  const client = new Client({
    user: "conf_user",
    host: "localhost",
    database: "confdb",
    password: "zxcvb",
    port: 5432,
  });
  client.connect(); // Установка соединения с базой данных
  return client; // Возвращение клиента для дальнейшего использования
}

// --------------------------
// Секция функций администратора
// --------------------------

// Функция для добавления нового пользователя
async function addUser(username, password) {
  const client = connectToDatabase(); // Подключение к базе данных
  const hashedPassword = await bcrypt.hash(password, saltRounds); // Хеширование пароля
  const addUserQuery = `  
        INSERT INTO admin_login (username, password_hash)
        VALUES ($1, $2);`; // SQL-запрос для добавления пользователя
  try {
    await client.query(addUserQuery, [username, hashedPassword]); // Выполнение запроса
    console.log("User added successfully"); // Логирование успешного выполнения
  } catch (err) {
    console.error("Insertion error", err.stack); // Логирование ошибки вставки
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}

// Функция для изменения пароля пользователя
async function changeUserPassword(username, newPassword) {
  const client = connectToDatabase(); // Подключение к базе данных
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds); // Хеширование нового пароля
  const changePasswordQuery = `
        UPDATE admin_login
        SET password_hash = $1
        WHERE username = $2;`; // SQL-запрос для изменения пароля
  try {
    await client.query(changePasswordQuery, [hashedPassword, username]); // Выполнение запроса
    console.log("Password updated successfully"); // Логирование успешного выполнения
  } catch (err) {
    console.error("Update error", err.stack); // Логирование ошибки обновления
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}

// Функция для проверки учетных данных пользователя
async function checkUser(username, password) {
  const client = connectToDatabase(); // Подключение к базе данных
  const getUserQuery = `  
        SELECT password_hash FROM admin_login
        WHERE username = $1;`; // SQL-запрос для получения хеша пароля пользователя
  try {
    const result = await client.query(getUserQuery, [username]); // Выполнение запроса
    const hashedPassword = result.rows[0]?.password_hash; // Получение хеша пароля
    if (!hashedPassword) {
      console.log("No user found with that username"); // Логирование отсутствия пользователя
      return false;
    }

    const match = await bcrypt.compare(password, hashedPassword); // Сравнение паролей
    return match; // Возвращение результата сравнения
  } catch (err) {
    console.error("Selection error", err.stack); // Логирование ошибки выборки
    return false;
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}

// --------------------------
// Секция функций чата
// --------------------------

// Функция для добавления сообщения в чат
async function addChatMessage(timestamp, sender, recipient, message_text) {
  const client = connectToDatabase(); // Подключение к базе данных
  const addMessageQuery = `  
        INSERT INTO chat_messages (timestamp, sender, recipient, message_text)
        VALUES ($1, $2, $3, $4);`; // SQL-запрос для добавления сообщения
  try {
    await client.query(addMessageQuery, [
      timestamp,
      sender,
      recipient,
      message_text,
    ]); // Выполнение запроса
    console.log("Message added successfully"); // Логирование успешного выполнения
  } catch (err) {
    console.error("Insertion error", err.stack); // Логирование ошибки вставки
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}


// Функция для чтения сообщений чата
async function readChatMessages(roomID) {
  const client = connectToDatabase();  // Подключение к базе данных
  const readMessagesQuery = `  
        SELECT * FROM chat_messages
        WHERE sender = $1 OR recipient = $1 OR recipient = 'all';`; // SQL-запрос для чтения сообщений
  try {
    const result = await client.query(readMessagesQuery, [roomID]);  // Выполнение запроса
    const messages = result.rows;  // Получение сообщений из результата запроса
    console.log("Messages retrieved successfully");  // Логирование успешного выполнения
    return messages;  // Возвращение сообщений
  } catch (err) {
    console.error("Selection error", err.stack);  // Логирование ошибки выборки
    return null;  // Возвращение null в случае ошибки
  } finally {
    client.end();  // Закрытие соединения с базой данных
  }
}

// Функция для удаления сообщений определенной комнаты
async function deleteChatMessages(roomID) {
  const client = connectToDatabase(); // Подключение к базе данных
  const deleteMessagesQuery = `  
        DELETE FROM chat_messages
        WHERE sender = $1 OR recipient = $1 ;`; // SQL-запрос для удаления сообщений
  try {
    await client.query(deleteMessagesQuery, [roomID]); // Выполнение запроса
    console.log("Messages deleted successfully"); // Логирование успешного выполнения
  } catch (err) {
    console.error("Deletion error", err.stack); // Логирование ошибки удаления
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}

// Функция для удаления всех сообщений чата
async function deleteAllChatMessages() {
  const client = connectToDatabase(); // Подключение к базе данных
  const deleteAllMessagesQuery = "DELETE FROM chat_messages;"; // SQL-запрос для удаления всех сообщений
  try {
    await client.query(deleteAllMessagesQuery); // Выполнение запроса
    console.log("All messages deleted successfully"); // Логирование успешного выполнения
  } catch (err) {
    console.error("Deletion error", err.stack); // Логирование ошибки удаления
  } finally {
    client.end(); // Закрытие соединения с базой данных
  }
}

// --------------------------
// Экспорт функций
// --------------------------

module.exports = {
  addUser,
  changeUserPassword,
  checkUser,
  addChatMessage,
  readChatMessages,
  deleteChatMessages,
  deleteAllChatMessages,
};

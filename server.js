// Подключение модулей
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const session = require("express-session");
const genuuid = require("uuid");
const { connected } = require("process");
const routeHandlers = require("./routeHandlers");
const socketManager = require('./socketManager');

const db = require("./admin_db");
const {
  getWaitingRooms,
  setWaitingRoom,
  removeWaitingRoom,
} = require("./waitingRoomData.js");
db.deleteAllChatMessages();

// Настройка экземпляров express, http и socket.io
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Настройка директории для статических файлов
app.use(express.static(path.join(__dirname, "html")));

// Настройка и использование сессий
const sessMidl = session({
  name: "SessionCookie",
  secret: "Shsh!Secret!",
  resave: false,
  saveUninitialized: true,
});
app.use(sessMidl);
io.engine.use(sessMidl); // Применение сессии к socket.io

// Определение маршрутов
app.get("/", routeHandlers.homeRouteHandler);
app.get("/conversation-room/:roomId", routeHandlers.conversationRoomHandler);
app.get("/user-room/:roomId", routeHandlers.userRoomHandler);
app.get("/admin", routeHandlers.adminPageHandler);


//Запуск сокетов
socketManager(io);

// Запуск сервера
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
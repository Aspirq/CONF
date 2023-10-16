// Подключение модулей
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const session = require("express-session");
const genuuid = require("uuid");
const { connected } = require("process");
const routeHandlers = require("./routeHandlers");

const db = require("./admin_db");
const { 
  getWaitingRooms, 
  setWaitingRoom, 
  removeWaitingRoom 
} = require("./waitingRoomData.js");

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

// Функции для работы с комнатами
function generateRoomId() {
  return genuuid.v4(); // Генерация уникального идентификатора для комнаты
}

function createWaitingRoom(fullName) {
  const roomId = generateRoomId();
  New_waitingRoom = {
    listenerFullName: fullName,
    offer: null,
    socketIds: null,
    SecondCaller: null,
    boss: false,
    isConnected: false,
  };
  // Сохранение информации о комнате
  setWaitingRoom(roomId, New_waitingRoom);
  return roomId;
}
// Обработка представления пользователя
io.on("connection", (socket) => {
  socket.on("GetRooms", (data) => {
    const waitingRooms = getWaitingRooms();
    console.log("GetRooms");
    socket.emit("SetRooms", waitingRooms);
  });

  socket.on("adminGotoRoom", (roomId) => {
    if (socket.request.session.isAdmin)
      socket.to("admins").emit("adminGotoRoom", roomId);
  });

  socket.on("sendRoomReload", (roomId) => {
    if (socket.request.session.isAdmin) {
      const waitingRooms = getWaitingRooms();
      waitingRooms[roomId].isConnected = false;
      setWaitingRoom(roomId, waitingRooms[roomId]);
      socket.to(roomId).emit("callRoomReload");
    }
  });

  socket.on("sendRoomDelete", (roomId) => {
    if (socket.request.session.isAdmin) {
      if (removeWaitingRoom(roomId))
        socket.to(roomId).emit("callRoomReload", roomId);
      socket.emit("SetRooms", getWaitingRooms());
    }
  });

  socket.on("GetName", () => {
    const waitingRooms = getWaitingRooms();
    const roomID = socket.request.session.roomId;
    console.log("GetName");
    socket.emit("SetName", waitingRooms[roomID]);
  });

  socket.on("chatSendMessage", (msg_to, msg_text) => {
    const waitingRooms = getWaitingRooms();
    const roomID = socket.request.session.roomId;
    const msgTime = new Date(Date.now());
    if (socket.request.session.isAdmin) {
      if (msg_to == "all") {
        io.emit("chatInputMessage", msgTime, "Admin", "all", msg_text);
      } else {
        socket.to(msg_to).emit("chatInputMessage", msgTime, "Admin", msg_to, msg_text);
        socket.emit("chatInputMessage", msgTime, "Admin",  msg_to, msg_text);
      }
    } else {
      socket.emit("chatInputMessage",msgTime, roomID, msg_to, msg_text);
      socket.to("admins").emit("chatInputMessage",msgTime, roomID, msg_to, msg_text);
    }
  });

  socket.on("RenameRoom", (roomId, newRoomName) => {
    const waitingRooms = getWaitingRooms();
    waitingRooms[roomId].listenerFullName = newRoomName;
    console.log("GetName");
    //socket.emit("SetName", waitingRooms[roomID]);
  });

  socket.on("adminLogin", (username, password) => {
    db.checkUser(username, password)
      .then((match) => {
        socket.request.session.isAdmin = match;
        socket.request.session.save();
        socket.emit("adminLogin_answer", match);
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  });

  // Обработка представления пользователя
  socket.on("userPresentation", (data) => {
    const { fullName } = data;
    // Создание комнаты
    const roomId = createWaitingRoom(fullName);
    socket.request.session.roomId = roomId;
    socket.request.session.save();

    // Отправка подтверждения клиенту
    socket.emit("presentationSuccess", {
      message: "Комната создана",
      RID: roomId,
    });
  });

  socket.on("disconnecting", () => {
    console.log(socket.connected); // false
    console.log(socket.rooms);
    socket.to(socket.rooms).emit("DisconnecUser");
    const waitingRooms = getWaitingRooms();
    const roomID = socket.request.session.roomId;
    const room_set = io.of("/").adapter.rooms.get(roomID);
    if (waitingRooms[roomID] && room_set) {
      //if (room_set.size <= 1)
      if (!socket.request.session.isAdmin)
        waitingRooms[roomID].isConnected = false;
      setWaitingRoom(roomID, waitingRooms[roomID]);
      socket.to("admins").emit("SetRooms", waitingRooms);
      console.log(getWaitingRooms());
    }
  });

  io.of("/").adapter.setMaxListeners(200);

  io.of("/").adapter.on("leave-room", (room, id) => {
    //console.log(`socket ${id} has leave room ${room}`);
    socket.to(room).emit("DisconnecUser");
  });

  socket.on("isAdmin", () => {
    socket.join("admins");
  });

  // Обработка доступности локального потока
  socket.on("localStreamAvailable", () => {
    const roomID = socket.request.session.roomId;
    socket.join(roomID);
    const waitingRooms = getWaitingRooms();
    if (waitingRooms[roomID]) {
      waitingRooms[roomID].isConnected = true;
      setWaitingRoom(roomID, waitingRooms[roomID]);
      socket.to("admins").emit("SetRooms", waitingRooms);
      console.log(getWaitingRooms());
    }
    // Отправка сигнала о наличии локального потока
    socket.emit("remoteStreamAvailable");
  });

  // Обработка оффера
  socket.on("offer", (offer) => {
    const roomID = socket.request.session.roomId;
    // Передача оффера другому участнику
    socket.to(roomID).emit("offer", offer);
  });

  // Обработка ответа
  socket.on("answer", (answer) => {
    const roomID = socket.request.session.roomId;
    // Передача ответа другому участнику
    socket.to(roomID).emit("answer", answer);
  });

  // Обработка кандидатов для установки соединения
  socket.on("iceCandidate", (event) => {
    const roomID = socket.request.session.roomId;
    // Передача кандидата другому участнику
    socket.to(roomID).emit("iceCandidate", event);
  });
});

// Запуск сервера
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
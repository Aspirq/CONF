const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const db = require("./admin_db");

db.checkUser("ana", "1234")
  .then((match) => {
    console.log(match ? "User verified" : "Verification failed");
  })
  .catch((error) => {
    console.error("An error occurred:", error);
  });

var genuuid = require("uuid");
const { connected } = require("process");

const { getWaitingRooms } = require("./waitingRoomData.js");
const { setWaitingRoom } = require("./waitingRoomData.js");

// Массив для хранения комнат ожидания
//const waitingRooms = {};
const urlencodedParser = express.urlencoded({ extended: false });

const routeHandlers = require("./routeHandlers");

// Разрешить обслуживание статических файлов из папки 'html'
app.use(express.static(path.join(__dirname, "html")));

sessMidl = session({
  name: "SessionCookie",
  secret: "Shsh!Secret!",
  resave: false,
  saveUninitialized: true,
});

app.use(sessMidl);
io.engine.use(sessMidl);

app.get("/", routeHandlers.homeRouteHandler);
app.get("/conversation-room/:roomId", routeHandlers.conversationRoomHandler);
app.get("/user-room/:roomId", routeHandlers.userRoomHandler);
app.get("/admin", routeHandlers.adminPageHandler);

// Обработка представления пользователя
io.on("connection", (socket) => {
  socket.on("GetRooms", (data) => {
    const waitingRooms = getWaitingRooms();
    console.log("GetRooms");
    socket.emit("SetRooms", waitingRooms);
  });

  socket.on("GetName", () => {
    const waitingRooms = getWaitingRooms();
    const roomID = socket.request.session.roomId;
    console.log("GetName");
    socket.emit("SetName", waitingRooms[roomID]);
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
    console.log(socket.rooms[1]);
    socket.to(socket.rooms).emit("DisconnecUser");
  });

  io.of("/").adapter.setMaxListeners(20);

  io.of("/").adapter.on("leave-room", (room, id) => {
    //console.log(`socket ${id} has leave room ${room}`);
    socket.to(room).emit("DisconnecUser");
  });

  // Обработка доступности локального потока
  socket.on("localStreamAvailable", () => {
    const roomID = socket.request.session.roomId;
    socket.join(roomID);
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

// Генерация уникального идентификатора комнаты
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

// Создание комнаты ожидания для пользователя
function createWaitingRoom(fullName) {
  const roomId = generateRoomId();
  New_waitingRoom = {
    listenerFullName: fullName,
    offer: null,
    socketIds: null,
    SecondCaller: null,
    boss: false,
  };
  setWaitingRoom(roomId, New_waitingRoom);
  return roomId;
}

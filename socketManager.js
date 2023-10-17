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
  removeWaitingRoom,
} = require("./waitingRoomData.js");

module.exports = function (io) {
  // Инициализация Socket.IO при подключении пользователя.
  io.on("connection", (socket) => {
    // ----------------------------------------------
    // События связанные с аутентификацией и администрированием
    // ----------------------------------------------

    // Обработка входа администратора.
    socket.on("adminLogin", (username, password) => {
      // Проверка учетных данных пользователя.
      db.checkUser(username, password)
        .then((match) => {
          // Если учетные данные верны, устанавливаем статус администратора.
          socket.request.session.isAdmin = match;
          socket.request.session.save();
          // Отправляем результат проверки на клиентскую сторону.
          socket.emit("adminLogin_answer", match);
        })
        .catch((error) => {
          // В случае ошибки выводим сообщение.
          console.error("An error occurred:", error);
        });
    });

    // Присоединение администратора к специальной комнате "admins".
    socket.on("isAdmin", () => {
      socket.join("admins");
    });

    // ----------------------------------------------
    // Управление комнатами (создание, удаление, переименование)
    // ----------------------------------------------

    // Получение списка доступных комнат.
    socket.on("GetRooms", (data) => {
      // Получение списка ожидающих комнат.
      const waitingRooms = getWaitingRooms();
      console.log("GetRooms");
      // Отправка списка комнат клиенту.
      socket.emit("SetRooms", waitingRooms);
    });

    // Создание новой комнаты.
    socket.on("userPresentation", (data) => {
      const { fullName } = data;
      // Создаем новую комнату.
      const roomId = createWaitingRoom(fullName);
      // Сохраняем идентификатор комнаты в сессии пользователя.
      socket.request.session.roomId = roomId;
      socket.request.session.save();

      // Отправляем подтверждение об успешном создании комнаты.
      socket.emit("presentationSuccess", {
        message: "Комната создана",
        RID: roomId,
      });
    });

    // Переименование существующей комнаты.
    socket.on("RenameRoom", (roomId, newRoomName) => {
      const waitingRooms = getWaitingRooms();
      // Обновляем название комнаты.
      waitingRooms[roomId].listenerFullName = newRoomName;
    });

    // Удаление комнаты.
    socket.on("sendRoomDelete", (roomId) => {
      if (socket.request.session.isAdmin) {
        // Если комната успешно удалена...
        if (removeWaitingRoom(roomId)) {
          // ...уведомляем всех участников комнаты и обновляем список комнат.
          socket.to(roomId).emit("callRoomReload", roomId);
          socket.emit("SetRooms", getWaitingRooms());
          db.deleteChatMessages(roomId);
        }
      }
    });

    // Обработчик события "GetName", запускаемый, когда клиент отправляет запрос "GetName".
    socket.on("GetName", () => {
      // Получение списка ожидающих комнат.
      const waitingRooms = getWaitingRooms();

      // Получение идентификатора комнаты из сессии пользователя.
      const roomID = socket.request.session.roomId;

      // Логирование запроса для отладки или мониторинга.
      console.log("GetName");

      // Отправка ответа клиенту с информацией о комнате, в которой он находится.
      // "SetName" - это событие, которое клиент ожидает для получения данных,
      // а `waitingRooms[roomID]` содержит информацию о комнате пользователя.
      socket.emit("SetName", waitingRooms[roomID]);
    });

    //Запрос обновления комнаты
    socket.on("sendRoomReload", (roomId) => {
      if (socket.request.session.isAdmin) {
        const waitingRooms = getWaitingRooms();
        waitingRooms[roomId].isConnected = false;
        setWaitingRoom(roomId, waitingRooms[roomId]);
        socket.to(roomId).emit("callRoomReload");
      }
    });

    // ----------------------------------------------
    // Обмен сообщениями в чате
    // ----------------------------------------------

    // Отправка сообщения в чат.
    socket.on("chatSendMessage", (msg_to, msg_text) => {
      const waitingRooms = getWaitingRooms();
      const roomID = socket.request.session.roomId;
      // Записываем время отправки сообщения.
      const msgTime = new Date(Date.now());

      if (socket.request.session.isAdmin) {
        // Если сообщение предназначено для всех...
        if (msg_to == "all") {
          // ...разослать его всем участникам.
          io.emit("chatInputMessage", msgTime, "Admin", "all", msg_text);
          db.addChatMessage(msgTime, "Admin", "all", msg_text);
        } else {
          // Иначе отправить сообщение конкретному пользователю.
          socket
            .to(msg_to)
            .emit("chatInputMessage", msgTime, "Admin", msg_to, msg_text);

          socket.emit("chatInputMessage", msgTime, "Admin", msg_to, msg_text);
          db.addChatMessage(msgTime, "Admin", msg_to, msg_text);
        }
      } else {
        // Пользовательские сообщения также пересылаются администраторам.
        socket.emit("chatInputMessage", msgTime, roomID, msg_to, msg_text);
        socket
          .to("admins")
          .emit("chatInputMessage", msgTime, roomID, msg_to, msg_text);
        db.addChatMessage(msgTime, roomID, msg_to, msg_text);
      }
    });

    socket.on("getFullChat", () => {
      if (!socket.request.session.isAdmin) {
        const roomID = socket.request.session.roomId;
        db.readChatMessages(roomID).then((chatMessages) => {
          socket.emit("sendFullChat", chatMessages);
        });
      } else {
        db.readChatMessages("Admin").then((chatMessages) => {
          socket.emit("sendFullChat", chatMessages);
        });
      }
    });

    // ----------------------------------------------
    // Обработка мультимедиа и WebRTC
    // ----------------------------------------------

    // Обработка доступности локального потока.
    socket.on("localStreamAvailable", () => {
      const roomID = socket.request.session.roomId;
      // Присоединяемся к комнате.
      socket.join(roomID);
      if (socket.request.session.isAdmin) socket.join("admins");
      const waitingRooms = getWaitingRooms();

      // Если комната существует...
      if (waitingRooms[roomID]) {
        // ...помечаем, что пользователь теперь подключен.
        if (!socket.request.session.isAdmin)
          waitingRooms[roomID].isConnected = true;
        setWaitingRoom(roomID, waitingRooms[roomID]);

        // Уведомляем администраторов о изменении статуса комнат.
        socket.to("admins").emit("SetRooms", waitingRooms);
      }
      // Оповещаем о доступности удаленного потока.
      socket.emit("remoteStreamAvailable");
    });

    // Обработка предложения связи (offer) от одного пользователя к другому.
    socket.on("offer", (offer) => {
      const roomID = socket.request.session.roomId;
      // Пересылаем предложение всем участникам в комнате.
      socket.to(roomID).emit("offer", offer);
    });

    // Обработка ответа на предложение связи (answer).
    socket.on("answer", (answer) => {
      const roomID = socket.request.session.roomId;
      // Пересылаем ответ всем участникам в комнате.
      socket.to(roomID).emit("answer", answer);
    });

    // Обработка кандидатов ICE для установки мультимедийного соединения.
    socket.on("iceCandidate", (event) => {
      const roomID = socket.request.session.roomId;
      // Передаем информацию о кандидате другим участникам сессии.
      socket.to(roomID).emit("iceCandidate", event);
    });

    //Пересылка запроса доступных источников
   socket.on("getMediaSources", (roomID) => {
        socket.to(roomID).emit("getMediaSources");
    });
    //Пересылка ответа о доступных источниках
   socket.on("answerMediaSorceList", (devices, selectedVideo, selectedAudio) => {
        socket.to("admins").emit("answerMediaSorceList", devices, selectedVideo, selectedAudio);
    });
    //Пересылка запроса на изменение источника
    socket.on("setMediaSorce", (roomID, newVideoSorce, newAudioSorce)=> {
        socket.to(roomID).emit("setMediaSorce", newVideoSorce, newAudioSorce);
    });

    // ----------------------------------------------
    // Обработка событий подключения и отключения
    // ----------------------------------------------

    // Обработка отключения пользователя.
    socket.on("disconnecting", () => {
      console.log(socket.connected); // false
      console.log(socket.rooms);
      // Оповещаем всех участников в комнате об отключении пользователя.
      socket.to(socket.rooms).emit("DisconnecUser");
      const waitingRooms = getWaitingRooms();
      const roomID = socket.request.session.roomId;

      // Если пользователь был в комнате и он не администратор...
      if (waitingRooms[roomID] && !socket.request.session.isAdmin) {
        // ...меняем статус подключения на отключенный.
        waitingRooms[roomID].isConnected = false;
        setWaitingRoom(roomID, waitingRooms[roomID]);

        // Оповещаем администраторов об изменении статуса комнат.
        socket.to("admins").emit("SetRooms", waitingRooms);
      }
    });

    // Событие для обработки запроса администратора перейти в определенную комнату.
    socket.on("adminGotoRoom", (roomId) => {
      // Проверяем, является ли подключенный пользователь администратором.
      if (socket.request.session.isAdmin) {
        // Если пользователь - администратор, отправляем уведомление всем администраторам.
        socket.to("admins").emit("adminGotoRoom", roomId);
      }
    });

    // Установка максимального количества обработчиков для предотвращения утечки памяти.
    io.of("/").adapter.setMaxListeners(200);

    // Обработка события выхода пользователя из комнаты.
    io.of("/").adapter.on("leave-room", (room, id) => {
      // Оповещаем всех участников в комнате об отключении пользователя.
      socket.to(room).emit("DisconnecUser");
    });
  });
};

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

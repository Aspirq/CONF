const path = require("path");
const { getWaitingRooms } = require("./waitingRoomData.js");

//Обработчик домашней дерриктории
exports.homeRouteHandler = (req, res) => {
  const waitingRooms = getWaitingRooms();
  if (waitingRooms[req.session.roomId]) {
    res.redirect("/user-room/" + req.session.roomId);
  } else {
    res.sendFile(
      path.join(__dirname, "html_temlate", "user-presentation.html")
    );
  }
};

//обработчик комнаты пользователя
exports.userRoomHandler = (req, res) => {
  const roomId = req.params.roomId;
  const waitingRooms = getWaitingRooms();
  // Проверка существования комнаты ожидания
  if (!waitingRooms[roomId]) {
    console.log("Комната не найдена");
    res.redirect("/");
  } else {
    setTimeout(() => {
      if (!getWaitingRooms()[roomId].isConnected) {
        req.session.roomId = roomId;
        // Отправка страницы комнаты ожидания
        res.sendFile(path.join(__dirname, "html_temlate", "user-room.html"));
      } else {
        //В комнате ктото есть, переподключение
        res.sendFile(path.join(__dirname, "html_temlate", "retry.html"));
      }
    }, 500);
  }
};

exports.conversationRoomHandler = (req, res) => {
  const roomId = req.params.roomId;
  const isAdmin = req.session.isAdmin;
  const waitingRooms = getWaitingRooms();
  // Проверка прав админа
  if (!isAdmin) {
    //return res.status(404).send("Комната ожидания не найдена");
    console.log("Попытка получить доступ без прав");
    res.redirect("/");
  } else {
    req.session.roomId = roomId;
    // Отправка страницы комнаты ожидания
    res.sendFile(path.join(__dirname, "html_temlate", "waiting-room.html"));
  }
};

exports.adminPageHandler = (req, res) => {
  const isAdmin = req.session.isAdmin;
  if (isAdmin == true) {
    res.sendFile(path.join(__dirname, "html_temlate", "admin.html"));
  } else {
    res.sendFile(path.join(__dirname, "html_temlate", "login.html"));
  }
};

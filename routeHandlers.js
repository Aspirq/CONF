const path = require("path");
const { getWaitingRooms } = require('./waitingRoomData.js');


//Обработчик домашней дерриктории
exports.homeRouteHandler = (req, res) => {
  if (req.session.roomId != undefined) {
    res.redirect("/user-room/" + req.session.roomId);
  } else {
    res.sendFile(path.join(__dirname, "public", "user-presentation.html"));
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
    //req.session.roomId = roomId;
    // Отправка страницы комнаты ожидания
    res.sendFile(path.join(__dirname, "public", "user-room.html"));
  }
};

exports.conversationRoomHandler = (req, res) => {
  const roomId = req.params.roomId;
  const waitingRooms = getWaitingRooms();
  // Проверка существования комнаты ожидания
  if (!waitingRooms[roomId]) {
    //return res.status(404).send("Комната ожидания не найдена");
    console.log("Комната не найдена");
    res.redirect("/");
  } else {
    //req.session.roomId = roomId;
    // Отправка страницы комнаты ожидания
    res.sendFile(path.join(__dirname, "public", "waiting-room.html"));
  }
};

exports.adminPageHandler = (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
};

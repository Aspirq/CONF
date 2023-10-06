let waitingRooms = {};

function getWaitingRooms() {
    return waitingRooms;
}

function setWaitingRoom(roomId, roomData) {
    waitingRooms[roomId] = roomData;
}

function removeWaitingRoom(roomId) {
    if (waitingRooms.hasOwnProperty(roomId)) {
        delete waitingRooms[roomId];
        return true;  // Возвращает true, если комната была успешно удалена
    }
    return false;  // Возвращает false, если комнаты с таким ID не существует
}

module.exports = { getWaitingRooms, setWaitingRoom, removeWaitingRoom};